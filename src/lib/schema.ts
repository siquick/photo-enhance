import { z } from 'zod';

export const instructionSchema = z
  .string()
  .trim()
  .max(500, 'Instruction too long')
  .optional();

export const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

export function assertImageFile(file: File, maxMB = 8) {
  if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type)) {
    throw new Error('Unsupported image type');
  }
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > maxMB) throw new Error(`File too large: ${sizeMB.toFixed(1)} MB`);
}
