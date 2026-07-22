import { z } from 'zod';

export const authSchema = z.object({
  username: z.string().min(3, 'Логін має бути від 3 символів').max(30, 'Логін має бути до 30 символів').regex(/^[a-zA-Z0-9_-]+$/, 'Літери, цифри, _ та -'),
  password: z.string().min(6, 'Пароль має бути від 6 символів').max(100, 'Занадто довгий пароль'),
});

export const sendMessageSchema = z.object({
  text: z.string().min(1, 'Повідомлення не може бути порожнім').max(10000, 'Занадто довге повідомлення'),
  roomId: z.string().min(1, 'Обов\'язковий roomId'),
  replyTo: z.string().optional(),
  ttl: z.number().int().min(0).max(86400).optional(),
});

export const messageActionSchema = z.object({
  action: z.enum(['edit', 'delete']),
  msgId: z.string().min(1),
  roomId: z.string().min(1),
  text: z.string().optional(),
});

export const messageReactionSchema = z.object({
  msgId: z.string().min(1),
  roomId: z.string().min(1),
  emoji: z.string().min(1).max(10),
});
