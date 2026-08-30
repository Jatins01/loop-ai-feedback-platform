import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/db'

/**
 * Zod schema for validating Claude classification output.
 */
export const classificationSchema = z.object({
  sentiment: z.enum(['POS', 'NEU', 'NEG']),
  sentimentScore: z.number().min(-1).max(1),
  themes: z.array(z.string().trim().min(1)),
  featureArea: z.string().trim(),
  rationale: z.string().trim(),
})

export type ClassificationResult = z.infer<typeof classificationSchema>

/**
 * Strips markdown code fences (```json ... ```) from model text output.
 */
export function extractJsonString(text: string): string {
  let cleaned = text.trim()
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7)
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3)
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3)
  }
  return cleaned.trim()
}

/**
 * Returns a server-side Anthropic SDK instance if ANTHROPIC_API_KEY is present.
 */
export function getAnthropicClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return null
  }
  return new Anthropic({ apiKey })
}

const SYSTEM_PROMPT = `You are an AI customer feedback classifier for Project LOOP.
Analyze the customer feedback content and categorize it with:
1. sentiment: "POS" (Positive), "NEU" (Neutral), or "NEG" (Negative).
2. sentimentScore: A floating point number from -1.0 (most negative) to 1.0 (most positive), with 0.0 being neutral.
3. themes: An array of 1 to 3 theme names that accurately categorize the feedback topic.
   - You MUST reuse matching theme names from the provided existing workspace themes whenever they fit reasonably well, to avoid duplicate themes (e.g. use "Billing" instead of creating "Billing Issues" or "Payment/Billing").
   - If none of the existing themes fit, provide a concise, capitalized new theme name (e.g. "Onboarding", "Mobile App", "SSO").
4. featureArea: A short identifier string for the feature or product area (e.g. "billing", "dashboard", "authentication", "exports", "mobile").
5. rationale: A brief 1-2 sentence explanation for the classification.

Return ONLY a valid JSON object matching this schema:
{
  "sentiment": "POS" | "NEU" | "NEG",
  "sentimentScore": number (-1.0 to 1.0),
  "themes": string[],
  "featureArea": string,
  "rationale": string
}

Do not include markdown fences, backticks, or any other surrounding text. Return ONLY the raw JSON object.`

/**
 * Calls Claude via Anthropic SDK to classify feedback content.
 * Retries exactly once if JSON parsing or Zod schema validation fails.
 */
export async function classifyFeedback(
  content: string,
  existingThemes: string[] = [],
  clientOverride?: Anthropic
): Promise<ClassificationResult | null> {
  const client = clientOverride ?? getAnthropicClient()
  if (!client) {
    console.warn(
      'Anthropic API key is not configured. Skipping AI classification.'
    )
    return null
  }

  const userPrompt = `Existing workspace themes: ${JSON.stringify(existingThemes)}

Customer Feedback:
"${content}"`

  // Attempt 1
  try {
    const response = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 500,
      temperature: 0.1,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const textContent =
      response.content && response.content[0]?.type === 'text'
        ? response.content[0].text
        : ''

    const jsonStr = extractJsonString(textContent)
    const parsed = JSON.parse(jsonStr)
    return classificationSchema.parse(parsed)
  } catch (firstErr) {
    console.warn(
      'First AI classification attempt failed, retrying once with stricter prompt...',
      firstErr instanceof Error ? firstErr.message : firstErr
    )

    // Attempt 2: Strict Retry
    try {
      const retryPrompt = `${userPrompt}

IMPORTANT: Your previous response failed validation. You MUST return ONLY a valid, parseable JSON object with keys: "sentiment" ("POS"|"NEU"|"NEG"), "sentimentScore" (number between -1 and 1), "themes" (string array), "featureArea" (string), "rationale" (string). No markdown, no fences, no other text.`

      const retryResponse = await client.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 500,
        temperature: 0.0,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: retryPrompt }],
      })

      const retryTextContent =
        retryResponse.content && retryResponse.content[0]?.type === 'text'
          ? retryResponse.content[0].text
          : ''

      const retryJsonStr = extractJsonString(retryTextContent)
      const retryParsed = JSON.parse(retryJsonStr)
      return classificationSchema.parse(retryParsed)
    } catch (secondErr) {
      console.error(
        'AI classification failed on retry attempt:',
        secondErr instanceof Error ? secondErr.message : secondErr
      )
      return null
    }
  }
}

/**
 * Persists classification results (sentiment, sentimentScore, workspace-scoped themes, FeedbackTheme links)
 * to a feedback record.
 */
export async function applyClassification(
  feedbackId: string,
  workspaceId: string,
  classification: ClassificationResult
): Promise<void> {
  // 1. Update feedback sentiment & score
  await prisma.feedback.update({
    where: {
      id: feedbackId,
      workspaceId,
    },
    data: {
      sentiment: classification.sentiment,
      sentimentScore: classification.sentimentScore,
    },
  })

  // 2. Find or create themes within workspace & link them
  for (const rawTheme of classification.themes) {
    const themeName = rawTheme.trim()
    if (!themeName) continue

    let theme = await prisma.theme.findFirst({
      where: {
        workspaceId,
        name: {
          equals: themeName,
          mode: 'insensitive',
        },
      },
    })

    if (!theme) {
      try {
        theme = await prisma.theme.create({
          data: {
            name: themeName,
            workspaceId,
          },
        })
      } catch {
        theme = await prisma.theme.findFirst({
          where: {
            workspaceId,
            name: {
              equals: themeName,
              mode: 'insensitive',
            },
          },
        })
      }
    }

    if (theme) {
      await prisma.feedbackTheme.upsert({
        where: {
          feedbackId_themeId: {
            feedbackId,
            themeId: theme.id,
          },
        },
        create: {
          feedbackId,
          themeId: theme.id,
          confidence: 1.0,
        },
        update: {
          confidence: 1.0,
        },
      })
    }
  }
}