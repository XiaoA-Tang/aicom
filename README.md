# aicom

AI chat web app with DeepSeek text streaming and DashScope TTS.

## Stack

- Next.js App Router, React, TypeScript
- Tailwind CSS, lucide-react
- DeepSeek chat completions through server route handlers
- DashScope Qwen-TTS Realtime through a server-side WebSocket adapter
- Prisma + PostgreSQL for conversation storage

## Local Setup

Create `.env.local` from `.env.example` and fill the server-side keys:

```env
DEEPSEEK_API_KEY=
DASHSCOPE_API_KEY=
ADMIN_PASSWORD=
```

Then run:

```bash
npm install
npm run dev
```

Temporary project artifacts belong in `.tmp/`.

The default TTS provider is `dashscope-qwen-realtime`, using
`qwen3-tts-flash-realtime` with `Cherry` voice and WAV output.

## Production

Create `.env.production` on the server from `.env.example`, fill the real
server-side values, then run:

```bash
docker compose up -d --build
```

The app listens on `127.0.0.1:3000` in Docker Compose. Use the sample Nginx
config in `nginx/aicom.conf.example` to expose it on port 80.
