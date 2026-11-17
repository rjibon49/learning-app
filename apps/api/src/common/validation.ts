import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

/**
 * Validate any request input (body, query, param) with a Zod schema.
 * Throws 400 with field errors so the CMS / apps can show them.
 *
 * Use this one shared helper instead of copying `validate()` into every controller.
 */
export function validate<T extends z.ZodType>(
  schema: T,
  value: unknown,
): z.output<T> {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new BadRequestException(z.flattenError(result.error));
  }

  return result.data;
}

/** Prisma CUID id used by every table. */
export const idSchema = z.cuid();

/**
 * `?permanent=true` on any admin DELETE route.
 * Without it the route keeps its old safe behaviour (archive / deactivate).
 */
export const deleteQuerySchema = z
  .object({
    permanent: z
      .enum(['true', 'false', '1', '0'])
      .optional()
      .transform((value) => value === 'true' || value === '1'),
  })
  .passthrough();

export function isPermanent(query: unknown): boolean {
  return validate(deleteQuerySchema, query ?? {}).permanent;
}
