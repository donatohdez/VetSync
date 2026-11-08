import { z } from 'zod';
import { AppError } from './errors.js';
export const text = (max: number) => z.string().trim().min(1).max(max);
export const idSchema = text(36);
export const instantSchema = z.iso.datetime({offset: true});
export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
 const result = schema.safeParse(value);
 if (!result.success) throw new AppError('VALIDATION_ERROR', result.error.issues.map(i=>`${i.path.join('.') || 'datos'}: ${i.message}`).join('; '));
 return result.data;
}
