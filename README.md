# WhatsChat

WhatsChat is a WhatsApp Desktop-style chat MVP built with NestJS and the Meta WhatsApp Cloud API. It provides a small local interface for managing conversations, sending text messages, and receiving incoming messages and delivery updates through Meta webhooks.

> This is an MVP demo, not a production-ready WhatsApp client. In particular, it does not yet provide user authentication or webhook signature validation.

## Tech stack

- NestJS 10 and TypeScript
- Prisma ORM with SQLite
- Meta WhatsApp Cloud API
- Static HTML interface served by NestJS

## Implemented features

- Conversation list with the latest message
- Create or open a conversation from a WhatsApp number
- Conversation message history
- Outbound text messages through the WhatsApp Cloud API
- Incoming WhatsApp messages through Meta webhooks
- Message status updates: queued, sent, delivered, read, received, and failed
- Local SQLite persistence for contacts, conversations, and messages
- Health endpoint at `GET /api/health`

## Setup

1. Create your local configuration:

   ```bash
   cp .env.example .env
   ```

2. Fill in the required Meta WhatsApp values in `.env`:

   - `WHATSAPP_TOKEN`
   - `WHATSAPP_PHONE_NUMBER_ID`
   - `WHATSAPP_VERIFY_TOKEN`
   - `WHATSAPP_API_VERSION` (for example, `v20.0`)

3. Install dependencies and create the database schema:

   ```bash
   npm install
   npx prisma migrate dev
   ```

4. Start the application in development mode:

   ```bash
   npm run start:dev
   ```

Open `http://localhost:3000/` for the chat UI.

## Architecture overview

The NestJS application is organized by responsibility:

- `src/chat/` exposes the chat API and coordinates conversations, message persistence, and outbound delivery.
- `src/whatsapp/` calls Meta's Graph API using credentials loaded from environment variables.
- `src/webhook/` verifies Meta's webhook challenge and processes incoming message and status events.
- `src/prisma/` provides the shared Prisma client.
- `prisma/schema.prisma` defines the SQLite models for contacts, conversations, and messages.
- `public/` contains the static WhatsApp Desktop-style interface served at `/`.

### API endpoints

- `GET /api/health` — application health status
- `GET /api/chat/conversations` — conversation list
- `POST /api/chat/conversations` — create or open a conversation
- `GET /api/chat/conversations/:id/messages` — message history
- `POST /api/chat/send` — send a text message
- `GET /webhook` — Meta webhook verification
- `POST /webhook` — Meta webhook event receiver

## Meta webhook setup

For local Meta webhook testing, expose the application with a public HTTPS tunnel and configure its callback URL as:

```text
https://your-public-host/webhook
```

Use the same `WHATSAPP_VERIFY_TOKEN` in Meta and in your local `.env`, then subscribe the app to the `messages` webhook field.

## Security notes

- `.env` is intentionally ignored by Git. Never commit real Meta access tokens, phone IDs, verify tokens, or database files.
- Configure a unique webhook verify token per environment.
- Before production use, add verification of Meta's `X-Hub-Signature-256` header and application authentication.

## WhatsApp API behavior

Free-form text delivery is subject to WhatsApp's 24-hour customer service window. Meta may reject messages outside that window; WhatsChat records those messages with a `FAILED` status.
