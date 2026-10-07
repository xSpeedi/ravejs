import z from 'zod';

export const UserSchema = z.object({
  avatar: z.string(),
  country: z.string(),
  displayName: z.string().optional(),
  handle: z.string().optional(),
  id: z.number(),
  lang: z.string().optional(),
  lat: z.number(),
  lng: z.number(),
  name: z.string(),
});

export const ProfileSchema = UserSchema.omit({
  id: true,
  lat: true,
  lng: true,
  lang: true,
});

export type User = z.infer<typeof UserSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
