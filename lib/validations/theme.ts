import { z } from 'zod'

/**
 * Zod schema for GET /api/themes query parameters.
 */
export const getThemesQuerySchema = z.object({
  includeEmpty: z
    .preprocess((val) => {
      if (val === undefined || val === null || val === '') return true
      if (val === 'true' || val === true) return true
      if (val === 'false' || val === false) return false
      return val
    }, z.boolean({ message: 'includeEmpty must be a boolean' }))
    .default(true),
})

export type GetThemesQueryInput = z.infer<typeof getThemesQuerySchema>

/**
 * Zod schema for POST /api/themes body.
 */
export const createThemeSchema = z
  .object({
    name: z
      .string({ message: 'Name is required' })
      .trim()
      .min(1, 'Name cannot be empty')
      .max(100, 'Name cannot exceed 100 characters'),
    description: z
      .string()
      .trim()
      .max(1000, 'Description cannot exceed 1000 characters')
      .optional()
      .nullable()
      .transform((v) => (v === '' ? null : v ?? null)),
    color: z
      .string()
      .trim()
      .max(50, 'Color cannot exceed 50 characters')
      .optional()
      .nullable()
      .transform((v) => (v === '' ? null : v ?? null)),
  })
  .strict()

export type CreateThemeInput = z.infer<typeof createThemeSchema>

/**
 * Zod schema for GET /api/themes/trends query parameters.
 */
export const getThemeTrendsQuerySchema = z.object({
  period: z
    .enum(['7d', '30d'], {
      message: "period must be either '7d' or '30d'",
    })
    .default('30d'),
  compareToPrevious: z
    .preprocess((val) => {
      if (val === undefined || val === null || val === '') return true
      if (val === 'true' || val === true) return true
      if (val === 'false' || val === false) return false
      return val
    }, z.boolean({ message: 'compareToPrevious must be a boolean' }))
    .default(true),
})

export type GetThemeTrendsQueryInput = z.infer<typeof getThemeTrendsQuerySchema>

/**
 * Zod schema for GET /api/themes/[id]/feedback query parameters.
 */
export const getThemeFeedbackQuerySchema = z.object({
  page: z.coerce.number().int().min(1, 'page must be >= 1').default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1, 'pageSize must be >= 1')
    .max(100, 'pageSize cannot exceed 100')
    .optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1, 'limit must be >= 1')
    .max(100, 'limit cannot exceed 100')
    .optional(),
})

export type GetThemeFeedbackQueryInput = z.infer<
  typeof getThemeFeedbackQuerySchema
>

