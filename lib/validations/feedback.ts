import { z } from 'zod'

export const FEEDBACK_CHANNELS = [
  'support_ticket',
  'app_review',
  'nps_survey',
  'sales_note',
  'community_post',
] as const

export const FEEDBACK_SENTIMENTS = ['POS', 'NEU', 'NEG'] as const
export const FEEDBACK_STATUSES = ['NEW', 'REVIEWED', 'ACTIONED'] as const

/**
 * Zod schema for creating a new feedback record.
 * workspaceId is explicitly NOT accepted in the create payload to prevent tenant spoofing.
 */
export const createFeedbackSchema = z
  .object({
    content: z
      .string()
      .trim()
      .min(1, 'Content cannot be empty')
      .max(10000, 'Content cannot exceed 10000 characters'),
    channel: z.enum(FEEDBACK_CHANNELS, {
      message: `Channel must be one of: ${FEEDBACK_CHANNELS.join(', ')}`,
    }),
    sourceRef: z
      .string()
      .trim()
      .max(255, 'sourceRef cannot exceed 255 characters')
      .optional()
      .nullable(),
    customerLabel: z
      .string()
      .trim()
      .max(255, 'customerLabel cannot exceed 255 characters')
      .optional()
      .nullable(),
    sentiment: z.enum(FEEDBACK_SENTIMENTS).optional().nullable(),
    sentimentScore: z
      .number()
      .min(-1, 'sentimentScore must be >= -1')
      .max(1, 'sentimentScore must be <= 1')
      .optional()
      .nullable(),
    status: z.enum(FEEDBACK_STATUSES).optional().default('NEW'),
  })
  .strict()

export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>

/**
 * Zod schema for GET /api/feedback query parameter validation.
 */
export const getFeedbackQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  channel: z.enum(FEEDBACK_CHANNELS).optional(),
  sentiment: z.enum(FEEDBACK_SENTIMENTS).optional(),
  status: z.enum(FEEDBACK_STATUSES).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  themeId: z.string().trim().min(1).optional(),
  theme: z.string().trim().min(1).optional(), // alias for themeId
  search: z.string().trim().min(1).max(500).optional(),
  q: z.string().trim().min(1).max(500).optional(), // alias for search
  sortBy: z.enum(['createdAt', 'sentimentScore']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export type GetFeedbackQueryInput = z.infer<typeof getFeedbackQuerySchema>

/**
 * Zod schema for PATCH /api/feedback/[id] status update.
 * Stricly only allows status field.
 */
export const updateFeedbackStatusSchema = z
  .object({
    status: z.enum(FEEDBACK_STATUSES, {
      message: `Status must be one of: ${FEEDBACK_STATUSES.join(', ')}`,
    }),
  })
  .strict()

export type UpdateFeedbackStatusInput = z.infer<typeof updateFeedbackStatusSchema>

export type FeedbackStatusType = (typeof FEEDBACK_STATUSES)[number]

export const ALLOWED_STATUS_TRANSITIONS: Record<
  FeedbackStatusType,
  readonly FeedbackStatusType[]
> = {
  NEW: ['REVIEWED'],
  REVIEWED: ['ACTIONED'],
  ACTIONED: [],
}

/**
 * Validates that a feedback status transition is permitted.
 */
export function isValidStatusTransition(
  currentStatus: FeedbackStatusType,
  targetStatus: FeedbackStatusType
): boolean {
  const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus]
  return allowed ? allowed.includes(targetStatus) : false
}

/**
 * CSV Import header constants.
 */
export const REQUIRED_CSV_HEADERS = ['content', 'channel'] as const
export const ALLOWED_CSV_HEADERS = [
  'content',
  'channel',
  'sourceRef',
  'customerLabel',
  'sentiment',
  'sentimentScore',
  'status',
] as const

/**
 * Zod schema for validating individual CSV feedback rows.
 */
export const csvFeedbackRowSchema = z
  .object({
    content: z
      .string()
      .trim()
      .min(1, 'Content cannot be empty')
      .max(10000, 'Content cannot exceed 10000 characters'),
    channel: z.enum(FEEDBACK_CHANNELS, {
      message: `Channel must be one of: ${FEEDBACK_CHANNELS.join(', ')}`,
    }),
    sourceRef: z
      .string()
      .trim()
      .max(255, 'sourceRef cannot exceed 255 characters')
      .optional()
      .nullable()
      .transform((val) => (val === '' ? null : val ?? null)),
    customerLabel: z
      .string()
      .trim()
      .max(255, 'customerLabel cannot exceed 255 characters')
      .optional()
      .nullable()
      .transform((val) => (val === '' ? null : val ?? null)),
    sentiment: z
      .enum(FEEDBACK_SENTIMENTS)
      .optional()
      .nullable()
      .or(z.literal(''))
      .transform((val) =>
        val === '' ? null : (val as (typeof FEEDBACK_SENTIMENTS)[number] | null)
      ),
    sentimentScore: z
      .preprocess((val) => {
        if (val === '' || val === null || val === undefined) return null
        const num = Number(val)
        return isNaN(num) ? val : num
      }, z.number().min(-1, 'sentimentScore must be >= -1').max(1, 'sentimentScore must be <= 1').nullable().optional()),
    status: z
      .enum(FEEDBACK_STATUSES)
      .optional()
      .nullable()
      .or(z.literal(''))
      .transform((val) =>
        val === '' || !val
          ? ('NEW' as const)
          : (val as (typeof FEEDBACK_STATUSES)[number])
      ),
  })
  .strict()

export type CsvFeedbackRowInput = z.infer<typeof csvFeedbackRowSchema>

