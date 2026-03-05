import { z } from "zod"
import { SUPPORTED_CURRENCIES } from "@/lib/fees"

export const createLinkSchema = z.object({
  fileId: z.string().uuid("Invalid file ID"),
  title: z
    .string()
    .min(1, "Title is required")
    .max(100, "Title must be under 100 characters"),
  description: z
    .string()
    .max(500, "Description must be under 500 characters")
    .optional()
    .nullable(),
  priceAmount: z
    .number()
    .int("Price must be in cents")
    .positive("Price must be greater than 0")
    .max(99999999, "Price too high"),
  priceCurrency: z.enum(SUPPORTED_CURRENCIES, {
    error: "Invalid currency",
  }),
  maxUnlocks: z
    .number()
    .int("Must be a whole number")
    .positive("Must be at least 1")
    .optional()
    .nullable(),
  previewUrl: z.string().url("Invalid URL").optional().nullable(),
})

export type CreateLinkInput = z.infer<typeof createLinkSchema>

export const updateLinkSchema = createLinkSchema
  .omit({ fileId: true })
  .partial()
  .extend({
    isActive: z.boolean().optional(),
  })

export type UpdateLinkInput = z.infer<typeof updateLinkSchema>

/**
 * Client-side schema for the price input field.
 * Validates user input as a positive decimal number with max 2 decimal places.
 * Minimum value is 0.50 (50 cents).
 */
export const priceDisplaySchema = z
  .string()
  .regex(
    /^\d+(\.\d{1,2})?$/,
    "Enter a valid price (e.g., 10.50)"
  )
  .refine(
    (val) => parseFloat(val) >= 0.5,
    "Minimum price is 0.50"
  )
  .refine(
    (val) => parseFloat(val) <= 999999.99,
    "Price too high"
  )
