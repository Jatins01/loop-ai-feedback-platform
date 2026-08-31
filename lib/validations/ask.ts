import { z } from 'zod'

/**
 * Zod schema for POST /api/insights/ask request body.
 */
export const askQuestionSchema = z
  .object({
    question: z
      .string({ message: 'question is required' })
      .trim()
      .min(1, 'question cannot be empty')
      .max(2000, 'question cannot exceed 2000 characters'),
  })
  .strict()

export type AskQuestionInput = z.infer<typeof askQuestionSchema>
