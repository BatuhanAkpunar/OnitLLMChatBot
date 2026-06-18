# Onit AI

Multi-agent AI chat for software teams. Work with AI roles (**Analyst, Product
Manager, Project Manager, Product Designer, QA Engineer**) inside a single
project-based conversation. Mention one or more agents with `@`, see each
agent's brief reasoning before it answers, and switch between **Plan** and
**Build** modes.

Built with **Next.js 16** (App Router), **Supabase** (Postgres + Auth + RLS),
**OpenRouter** (LLM gateway), and the **Vercel AI SDK**.

## Features

- Google OAuth via Supabase Auth
- Multi-agent chat: `@mention` one or more roles per message; agents see each
  other's notes
- Streaming responses with a collapsible "thinking" step before each answer
- Plan / Build modes (Plan ends with "Shall I continue?" + Approve / Modify)
- Tiered context with automatic summarization (last 20 full, 20–100 summarized,
  100+ collapsed into a one-line project intro)
- Token counting with a ~100k context budget
- Prompt-injection guardrails (embedded in every system prompt + lightweight
  in-process input/output filters)
- Admin panel: usage dashboard, editable agent prompts (live preview), and
  per-user / per-model usage with a date filter

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in the values (see below).
3. Apply the schema in the Supabase SQL editor: run
   `supabase/migrations/0001_init.sql`, then `supabase/migrations/0002_seed_agents.sql`.
4. `npm run dev` → http://localhost:3000

## Environment variables

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (server only) |
| `GEMINI_API_KEY` | Google AI Studio API key |
| `GEMINI_DEFAULT_MODEL` | Chat model (default `gemini-3.5-flash`) |
| `GEMINI_SUMMARY_MODEL` | Model for thinking + summaries (defaults to the chat model) |
| `GEMINI_FALLBACK_MODEL` | Failover model when the primary errors (defaults to the chat model) |
| `NEXT_PUBLIC_SITE_URL` | App URL, used for the OAuth redirect |
| `ADMIN_EMAIL` | The email allowed to access `/admin` |

## Google OAuth

Enable the **Google** provider under Supabase → Authentication → Providers using
a Google Cloud OAuth client whose redirect URI is
`https://<project-ref>.supabase.co/auth/v1/callback`. Add your local and
production URLs under Authentication → URL Configuration.

## Tests

`npm test` runs unit tests for mention parsing, token budgeting, and the
security filters.

## Deploy (Vercel)

Push to the connected GitHub repo; Vercel builds automatically. Set all
environment variables above in the Vercel project settings, and point
`NEXT_PUBLIC_SITE_URL` at the production URL.
