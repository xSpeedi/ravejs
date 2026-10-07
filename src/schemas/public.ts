import z from 'zod';
import { AccountSchema } from './rave/account';

export const LanguagesSchema = z.enum([
  'en',
  'ru',
  'de',
  'fr',
  'es',
  'it',
  'pt',
  'ar',
  'pl',
  'nl',
  'uk',
]);
export const AuthenticatorMethodSchema = z.enum(['LOGIN', 'REGISTER']);
export const SitesSchema = z.enum(['Telegram']);

export const CredentialsSchema = z.object({
  token: z.string(),
  deviceId: z.string(),
});

export const RaveConfigSchema = z.object({
  credentials: z
    .object({
      ...CredentialsSchema.shape,
    })
    .optional(),
  enableLogging: z.boolean().optional(),
  account: AccountSchema.optional(),
});

export const EditProfileBuilderSchema = z.object({
  displayAvatar: z.string().optional(),
  displayName: z.string().optional(),
  handle: z.string().optional(),
});

export const GetManyMeshesSchema = z.object({
  isPublic: z.boolean().optional(),
  limit: z.number().default(20),
  hasFriends: z.boolean().optional(),
  local: z.boolean().optional(),
  hasInvited: z.boolean().optional(),
});

export type Credentials = z.infer<typeof CredentialsSchema>;
export type RaveConfig = z.infer<typeof RaveConfigSchema>;
export type EditProfileBuilder = z.infer<typeof EditProfileBuilderSchema>;
export type GetManyMeshesParams = z.infer<typeof GetManyMeshesSchema>;
export type Languages = z.infer<typeof LanguagesSchema>;
export type AuthenticatorMethod = z.infer<typeof AuthenticatorMethodSchema>;
export type Sites = z.infer<typeof SitesSchema>;
