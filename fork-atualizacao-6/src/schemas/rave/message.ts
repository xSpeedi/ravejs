import z from 'zod';

export const MessageSchema = z
  .object({
    chat: z.string(),
    detected_lang: z.string(),
    id: z.string(),
    translations: z.record(z.string(), z.string()),
  })
  .transform((data) => {
    return {
      content: data.chat,
      detectedLang: data.detected_lang,
      id: data.id,
      translations: data.translations,
    };
  });

export type Message = z.infer<typeof MessageSchema>;
