# Real-time Next.js 14 Messenger

Повноцінний месенджер реального часу, побудований на Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Pusher та Upstash Redis.

## 🚀 Як запустити локально

1. **Клонуйте або відкрийте проєкт**:
   ```bash
   git clone <your-repo>
   cd next-messenger
   ```

2. **Встановіть залежності**:
   ```bash
   npm install
   ```

3. **Налаштуйте змінні середовища**:
   Скопіюйте файл `.env.example` у `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Відкрийте `.env.local` і заповніть свої ключі від Pusher та Upstash Redis.

4. **Запустіть сервер розробки**:
   ```bash
   npm run dev
   ```
   Відкрийте [http://localhost:3000](http://localhost:3000) у браузері.

## ☁️ Деплой на Vercel

Найпростіший спосіб задеплоїти — використовувати Vercel CLI або підключити GitHub репозиторій до Vercel Dashboard.

### Через Vercel CLI:
1. Встановіть Vercel CLI, якщо ще не маєте:
   ```bash
   npm i -g vercel
   ```
2. Запустіть деплой (просто виконуйте інструкції в терміналі):
   ```bash
   vercel
   ```
3. Для деплою на продакшн:
   ```bash
   vercel --prod
   ```

> **Важливо:** Не забудьте додати всі змінні з `.env.local` у налаштування проєкту Vercel (Settings -> Environment Variables) перед продакшн-деплоєм!

## Технологічний стек
- **Фронтенд**: Next.js 14, React, Tailwind CSS, shadcn/ui
- **Бекенд**: Next.js API Routes (Serverless)
- **База даних (Історія)**: Upstash Redis
- **Реал-тайм**: Pusher Channels
