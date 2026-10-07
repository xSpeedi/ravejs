import z from 'zod';

import { UserSchema } from './user';

export const AccountSchema = z.object({
  ...UserSchema.shape,
  acceptDataPolicy: z.number(),
  acceptPrivacy: z.number(),
  acceptTos: z.number(),
  acceptWebIndexing: z.number(),
  gender: z.string(),
  pornScore: z.number(), // what the fuck
  userScore: z.number(),
  yearOfBirth: z.number(),
});

export type Account = z.infer<typeof AccountSchema>;
