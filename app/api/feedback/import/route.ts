import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePermission, Permission } from '@/lib/auth'
import {
  csvFeedbackRowSchema,
  REQUIRED_CSV_HEADERS,
  ALLOWED_CSV_HEADERS,
} from '@/lib/validations/feedback'
import Papa from 'papaparse'

// 5MB maximum CSV file upload size limit
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

interface RowFailure {
  row: number
  errors: string[]
}

/**
 * POST /api/feedback/import
 * Bulk imports feedback records from a CSV file via multipart/form-data.
 * Requires IMPORT_FEEDBACK permission.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Enforce authentication & permission
    const auth = await requirePermission(Permission.IMPORT_FEEDBACK)
    if (!auth.success) {
      return auth.response
    }

    // 2. Parse multipart/form-data
    let formData: FormData
    try {
      formData = await req.formData()
    } catch {
      return NextResponse.json(
        { error: 'Invalid form data. Expected multipart/form-data with a "file" field.' },
        { status: 400 }
      )
    }

    const file = formData.get('file')
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'No CSV file provided. Please attach a CSV file under the "file" field.' },
        { status: 400 }
      )
    }

    // 3. Validate file constraints
    if (file.size === 0) {
      return NextResponse.json(
        { error: 'The uploaded CSV file is empty.' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File size exceeds the 5MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB uploaded).` },
        { status: 400 }
      )
    }

    // 4. Read text & parse with PapaParse
    const csvText = await file.text()
    const parseResult = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => header.trim(),
    })

    if (parseResult.errors && parseResult.errors.length > 0) {
      const fatalErrors = parseResult.errors.filter(
        (e) => e.type === 'Quotes' || e.code === 'UndetectableDelimiter'
      )
      if (fatalErrors.length > 0) {
        return NextResponse.json(
          {
            error: 'Malformed CSV file format.',
            details: fatalErrors.map((e) => e.message),
          },
          { status: 400 }
        )
      }
    }

    const headers = parseResult.meta.fields ?? []
    if (headers.length === 0) {
      return NextResponse.json(
        { error: 'CSV file must contain a header row.' },
        { status: 400 }
      )
    }

    // 5. Header validation
    const missingRequired = REQUIRED_CSV_HEADERS.filter(
      (reqHeader) => !headers.includes(reqHeader)
    )
    if (missingRequired.length > 0) {
      return NextResponse.json(
        {
          error: `Missing required CSV header(s): ${missingRequired.join(', ')}. Required: ${REQUIRED_CSV_HEADERS.join(', ')}`,
        },
        { status: 400 }
      )
    }

    const unexpectedHeaders = headers.filter(
      (h) => !(ALLOWED_CSV_HEADERS as readonly string[]).includes(h)
    )
    if (unexpectedHeaders.length > 0) {
      return NextResponse.json(
        {
          error: `Unexpected CSV header(s) detected: ${unexpectedHeaders.join(', ')}. Allowed headers: ${ALLOWED_CSV_HEADERS.join(', ')}`,
        },
        { status: 400 }
      )
    }

    const rows = parseResult.data
    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: 'CSV file contains no data rows.' },
        { status: 400 }
      )
    }

    // 6. Row-level validation
    const validRecords: Array<{
      content: string
      channel: string
      sourceRef: string | null
      customerLabel: string | null
      sentiment: 'POS' | 'NEU' | 'NEG' | null
      sentimentScore: number | null
      status: 'NEW' | 'REVIEWED' | 'ACTIONED'
      workspaceId: string
    }> = []

    const failures: RowFailure[] = []

    for (let index = 0; index < rows.length; index++) {
      const rawRow = rows[index]
      const rowNumber = index + 2 // 1-indexed (row 1 is header)

      const result = csvFeedbackRowSchema.safeParse(rawRow)

      if (!result.success) {
        failures.push({
          row: rowNumber,
          errors: result.error.issues.map((i) => i.message),
        })
      } else {
        const validated = result.data
        validRecords.push({
          content: validated.content,
          channel: validated.channel,
          sourceRef: validated.sourceRef ?? null,
          customerLabel: validated.customerLabel ?? null,
          sentiment: validated.sentiment ?? null,
          sentimentScore: validated.sentimentScore ?? null,
          status: validated.status ?? 'NEW',
          workspaceId: auth.user.workspaceId, // MANDATORY: strictly session-derived
        })
      }
    }

    // 7. Batch insert valid rows
    if (validRecords.length > 0) {
      await prisma.feedback.createMany({
        data: validRecords,
      })
    }

    return NextResponse.json(
      {
        success: true,
        totalRows: rows.length,
        successCount: validRecords.length,
        failureCount: failures.length,
        failures,
      },
      { status: 200 }
    )
  } catch (err: unknown) {
    console.error('Error importing feedback CSV:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
