# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-06)

**Core value:** Creators can upload a file, set a price, share a link, and get paid -- in under 2 minutes
**Current focus:** v1.1 Docker Deployment

## Current Position

Milestone: v1.1 Docker Deployment
Phase: Not started (defining requirements)
Status: Defining requirements
Last activity: 2026-03-06 -- Milestone v1.1 started

Progress: ░░░░░░░░░░░░░░░ 0%

## Accumulated Context

### Pending Todos

- Configure Supabase email templates for confirm signup and reset password flows
- Add redirect URLs in Supabase dashboard (localhost and production)
- Consider migrating middleware.ts to Next.js 16 "proxy" convention
- Supabase project must be on Pro plan for 500MB file uploads (Free plan limits to 50MB)
- Using onboarding@resend.dev as dev sender (production needs custom domain)

### Blockers/Concerns

- Next.js 16 middleware deprecation: functional now but will need migration eventually
- Supabase email templates need manual dashboard configuration
- Server may have existing reverse proxy that needs investigation

## Session Continuity

Last session: 2026-03-06
Stopped at: Defining v1.1 milestone requirements
Resume file: None
