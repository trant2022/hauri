---
phase: 06-docker-deployment
plan: 01
subsystem: infra
tags: [docker, caddy, reverse-proxy, https, letsencrypt, standalone, deploy]

# Dependency graph
requires:
  - phase: 01-05 (all prior phases)
    provides: Complete Next.js app ready for containerization
provides:
  - Multi-stage Dockerfile with standalone output
  - Docker Compose with Caddy reverse proxy and auto-HTTPS
  - One-command deploy script for Ubuntu VPS
  - Environment variable documentation
affects: []

# Tech tracking
tech-stack:
  added: [docker, caddy]
  patterns: [multi-stage-docker-build, standalone-nextjs, reverse-proxy, auto-https]

key-files:
  created:
    - Dockerfile
    - .dockerignore
    - docker-compose.yml
    - Caddyfile
    - deploy.sh
    - .env.example
  modified:
    - next.config.ts
    - .gitignore

key-decisions:
  - "Two-stage Dockerfile (builder + runner) with standalone output for minimal image size"
  - "Caddy over Nginx for automatic HTTPS provisioning via Let's Encrypt"
  - "App does not expose ports to host -- all traffic routed through Caddy on internal Docker network"
  - "HTTP/3 (QUIC) enabled via 443:443/udp port mapping"

patterns-established:
  - "Standalone output: next.config.ts output: standalone for Docker deployments"
  - "Non-root container: nextjs user (uid 1001) in final Docker image"
  - "Git-pull deploy: deploy.sh runs git pull + docker compose down/up --build"
  - "Named volumes: caddy_data persists SSL certificates across rebuilds"

# Metrics
duration: 2min
completed: 2026-03-06
---

# Phase 6 Plan 1: Docker Deployment Summary

**Multi-stage Dockerfile with standalone output, Caddy reverse proxy with auto-HTTPS for test.trant.ch, and git-pull deploy script**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-06T00:15:06Z
- **Completed:** 2026-03-06T00:17:11Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Multi-stage Dockerfile producing minimal production image with non-root user
- Docker Compose orchestrating app + Caddy on internal bridge network
- Caddy auto-provisions HTTPS via Let's Encrypt for test.trant.ch
- SSL certificates persist across container rebuilds via named volume
- One-command deploy.sh for git-pull workflow on Ubuntu VPS
- All 9 environment variables documented in .env.example

## Task Commits

Each task was committed atomically:

1. **Task 1: Dockerfile, .dockerignore, and next.config.ts standalone output** - `f5c40ae` (feat)
2. **Task 2: Docker Compose, Caddyfile, deploy script, and env example** - `db7f4ce` (feat)
3. **Deviation fix: Allow .env.example in gitignore** - `13abe9f` (fix)

## Files Created/Modified
- `Dockerfile` - Multi-stage build (builder + runner) with node:22-alpine
- `.dockerignore` - Excludes node_modules, .next, .git, .env, .planning
- `next.config.ts` - Added output: "standalone" for Docker-optimized builds
- `docker-compose.yml` - App + Caddy services on internal bridge network
- `Caddyfile` - Reverse proxy config for test.trant.ch with auto-HTTPS
- `deploy.sh` - Git pull + docker compose rebuild script (executable)
- `.env.example` - All 9 required environment variables with descriptions
- `.gitignore` - Added !.env.example exception

## Decisions Made
- Two-stage Dockerfile (builder + runner) instead of three-stage -- standalone output bundles needed node_modules, eliminating the deps stage
- Caddy chosen for automatic HTTPS via Let's Encrypt with zero configuration
- App service does not expose ports to host -- Caddy handles all external traffic on the internal Docker network
- HTTP/3 (QUIC) enabled via 443:443/udp port mapping
- deploy.sh uses docker compose down before up --build for clean restarts

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added .env.example exception to .gitignore**
- **Found during:** Task 2 (committing .env.example)
- **Issue:** .gitignore pattern `.env*` blocked `.env.example` from being tracked by git
- **Fix:** Added `!.env.example` negation rule to .gitignore
- **Files modified:** .gitignore
- **Verification:** .env.example now tracked without force-add
- **Committed in:** 13abe9f

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential fix for .env.example to be properly tracked in git. No scope creep.

## Issues Encountered
- `docker compose config` validation failed initially because no `.env` file exists locally (gitignored). Created temporary `.env` from `.env.example` to validate syntax, then removed it. This is expected behavior -- `.env` only exists on the deployment server.

## User Setup Required
None - no external service configuration required beyond copying `.env.example` to `.env` and filling in values on the deployment server.

## Next Phase Readiness
- All deployment artifacts are ready
- To deploy: copy repo to Ubuntu VPS, create `.env` from `.env.example`, run `./deploy.sh`
- Caddy will auto-provision HTTPS for test.trant.ch on first request
- DNS must point test.trant.ch to the VPS IP address

---
*Phase: 06-docker-deployment*
*Completed: 2026-03-06*
