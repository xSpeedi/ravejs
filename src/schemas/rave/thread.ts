import z from 'zod';

export const ThreadSchema = z.object({
  expiryMode: z.number(),
  isFriend: z.boolean(),
  myself: z.number(),
  opposingUser: z.number(),
  spokenLangs: z.array(z.string()),
  threadId: z.string(),
});

export type Thread = z.infer<typeof ThreadSchema>;
