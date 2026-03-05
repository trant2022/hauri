# Unlockt

File monetization SaaS — creators lock digital files behind payment links.

## Tech Stack
- Next.js 14 App Router + TypeScript strict mode
- Supabase: PostgreSQL + Auth + Storage (private bucket)
- Stripe: Checkout + Connect Express + Identity + Webhooks
- Tailwind CSS + shadcn/ui
- Vercel deployment
- React Hook Form + Zod validation
- next-themes (dark mode)

## Conventions
- kebab-case for file names
- PascalCase for React components
- camelCase for functions and variables
- Types in /types folder
- DB queries in /lib/supabase/queries.ts
- Stripe logic in /lib/stripe/
- Error handling: try/catch in all API routes, return { error: string } on failure
- Every async action needs loading state + toast notification
- No inline styles — always Tailwind classes

## Planning
- All planning docs in `.planning/`
- Use `/gsd:progress` to check project status
