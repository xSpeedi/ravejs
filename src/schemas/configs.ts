import { z } from 'zod';

export const PostRequestConfigSchema = z.object({
  path: z.string().readonly(),
  baseUrl: z.string().optional(),
  body: z.string().readonly(),
  contentType: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
});

export const GetRequestConfigSchema = PostRequestConfigSchema.omit({
  body: true,
});

export const RawRequestConfigSchema = z.object({
  method: z.string(),
  headers: z.record(z.string(), z.string()).optional(),
  path: z.string().readonly(),
  body: z.union([z.string(), z.instanceof(Buffer)]).optional(),
});

export type PostRequestConfig = z.infer<typeof PostRequestConfigSchema>;
export type GetRequestConfig = z.infer<typeof GetRequestConfigSchema>;
export type RawRequestConfig = z.infer<typeof RawRequestConfigSchema>;
