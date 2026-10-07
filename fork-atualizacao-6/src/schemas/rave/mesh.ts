import z from 'zod';

export const MeshSchema = z.object({
  blurT: z.boolean().optional(),
  category: z.string(),
  channel: z.number(),
  createdAt: z.string(),
  currentState: z.enum(['play', 'paus']),
  explicit: z.boolean(),
  id: z.string(),
  isFriend: z.boolean(),
  isLocal: z.boolean(),
  isPublic: z.boolean(),
  kickMode: z.string(),
  maturity: z.string(),
  mediaUrl: z.string(),
  originator: z.number(),
  playMode: z.string(),
  position: z.number(),
  server: z.string(),
  shareLink: z.string(),
  thumbnails: z
    .object({
      channel: z.string().optional(),
      standard: z.string().optional(),
      animated: z.string().optional(),
      maxres: z.string().optional(),
      medium: z.string().optional(),
      default: z.string().optional(),
      high: z.string().optional(),
    })
    .optional(),
  time: z.number(),
  videoAuthor: z.string(),
  videoDuration: z.number(),
  videoProvider: z.string(),
  videoPublishedAt: z.string(),
  videoThumbnail: z.string(),
  videoTitle: z.string(),
  videoUrl: z.string(),
  vikiPass: z.boolean(),
  voipMode: z.string(),
});

export type Mesh = z.infer<typeof MeshSchema>;
