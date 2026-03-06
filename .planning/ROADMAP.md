# Roadmap: Unlockt

## Milestones

- v1.0 MVP - Phases 1-5 (shipped 2026-03-06)
- v1.1 Docker Deployment - Phase 6 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-5) - SHIPPED 2026-03-06</summary>

See archived roadmap: .planning/milestones/v1.0-ROADMAP.md

</details>

### v1.1 Docker Deployment (In Progress)

**Milestone Goal:** Deploy Unlockt to Ubuntu VPS with Docker, accessible at test.trant.ch with HTTPS via a simple git pull deploy workflow.

- [ ] **Phase 6: Docker Deployment** - Containerize app with Caddy reverse proxy and deploy script

## Phase Details

### Phase 6: Docker Deployment
**Goal**: App runs in Docker on Ubuntu VPS, served at test.trant.ch with automatic HTTPS, deployable via a single script
**Depends on**: Phase 5 (v1.0 complete -- working Next.js app to containerize)
**Requirements**: DOCK-01, DOCK-02, DOCK-03, COMP-01, COMP-02, COMP-03, COMP-04, DEPL-01, DEPL-02, CONF-01, CONF-02
**Success Criteria** (what must be TRUE):
  1. Running `docker compose up -d --build` produces a working container serving the Next.js app on the internal network
  2. Visiting https://test.trant.ch in a browser loads the Unlockt app with a valid SSL certificate
  3. Running `deploy.sh` on the server pulls latest code and restarts the app with zero manual steps beyond SSH
  4. A developer cloning the repo can copy `.env.example` to `.env`, fill in values, and have all required configuration documented
  5. Rebuilding containers preserves SSL certificates (no re-provisioning on every deploy)
**Plans:** 1 plan

Plans:
- [ ] 06-01-PLAN.md -- Dockerfile, Docker Compose, Caddy, deploy script, and env documentation

## Progress

**Execution Order:**
Phase 6 is the only phase in v1.1.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-5 | v1.0 | -- | Complete | 2026-03-06 |
| 6. Docker Deployment | v1.1 | 0/1 | Not started | - |
