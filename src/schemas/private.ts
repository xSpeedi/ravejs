import z from 'zod';

import { CredentialsSchema } from './public';

export const PagingSchema = z
  .object({
    next: z.string().optional(),
  })
  .optional();

export const MeshSocketConfigSchema = z.object({
  meshId: z.string(),
  server: z.string(),
  userId: z.number(),
  credentials: CredentialsSchema,
  proxy: z.string().optional(),
});

export type HeadersType = Record<string, string>;
export type MethodType = 'POST' | 'PUT';
export type AuthenticatorMethod = 'LOGIN' | 'REGISTER';
export type Paging = z.infer<typeof PagingSchema>;
export type MeshSocketConfig = z.infer<typeof MeshSocketConfigSchema>;
