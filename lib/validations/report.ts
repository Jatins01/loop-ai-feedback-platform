import { z } from 'zod'

/**
 * Zod schema for POST /api/reports request body.
 */
export const createReportSchema = z
  .object({
    periodStart: z
      .string({ message: 'periodStart is required' })
      .trim()
      .min(1, 'periodStart cannot be empty')
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'periodStart must be a valid date string',
      })
      .transform((val) => new Date(val)),
    periodEnd: z
      .string({ message: 'periodEnd is required' })
      .trim()
      .min(1, 'periodEnd cannot be empty')
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'periodEnd must be a valid date string',
      })
      .transform((val) => new Date(val)),
  })
  .strict()
  .refine((data) => data.periodStart <= data.periodEnd, {
    message: 'periodStart must be less than or equal to periodEnd',
    path: ['periodStart'],
  })

export type CreateReportInput = z.infer<typeof createReportSchema>

/**
 * Zod schema for GET /api/reports query parameters.
 */
export const getReportsQuerySchema = z.object({
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

export type GetReportsQueryInput = z.infer<typeof getReportsQuerySchema>
