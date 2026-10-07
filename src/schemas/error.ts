import { z } from 'zod';

export const APIErrorDataSchema = z.object({
  message: z.string(),
  name: z.string().optional(),
});

export type APIErrorData = z.infer<typeof APIErrorDataSchema>;
