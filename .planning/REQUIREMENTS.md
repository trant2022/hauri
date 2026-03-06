# Requirements: Unlockt v1.1 Docker Deployment

**Defined:** 2026-03-06
**Core Value:** Deploy Unlockt to Ubuntu VPS with Docker, accessible at test.trant.ch with HTTPS

## v1.1 Requirements

### Docker Build

- [x] **DOCK-01**: Dockerfile uses multi-stage build with Next.js standalone output for minimal image size
- [x] **DOCK-02**: Docker image includes only production dependencies (no dev deps, no source maps)
- [x] **DOCK-03**: .dockerignore excludes node_modules, .next, .git, .env, .planning

### Compose & Proxy

- [x] **COMP-01**: docker-compose.yml defines app service and Caddy reverse proxy service
- [x] **COMP-02**: Caddy automatically provisions HTTPS for test.trant.ch via Let's Encrypt
- [x] **COMP-03**: Caddy proxies HTTPS traffic to Next.js app on internal Docker network
- [x] **COMP-04**: Caddy data volume persists SSL certificates across rebuilds

### Deploy Workflow

- [x] **DEPL-01**: deploy.sh script runs git pull → docker compose down → docker compose up -d --build
- [x] **DEPL-02**: App starts and serves requests after deploy.sh completes

### Configuration

- [x] **CONF-01**: .env.example documents all required environment variables with placeholder values
- [x] **CONF-02**: App reads environment variables from .env file via Docker Compose

## Out of Scope

- CI/CD pipeline (GitHub Actions) -- overkill for test deployment
- Kubernetes -- single VPS, not a cluster
- Database container -- Supabase is cloud-hosted
- Docker registry -- build on server, not push/pull images
- Health checks / monitoring -- test deployment, not production SLA
- Zero-downtime deploys -- acceptable to have brief downtime on rebuild

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DOCK-01 | Phase 6 | Complete |
| DOCK-02 | Phase 6 | Complete |
| DOCK-03 | Phase 6 | Complete |
| COMP-01 | Phase 6 | Complete |
| COMP-02 | Phase 6 | Complete |
| COMP-03 | Phase 6 | Complete |
| COMP-04 | Phase 6 | Complete |
| DEPL-01 | Phase 6 | Complete |
| DEPL-02 | Phase 6 | Complete |
| CONF-01 | Phase 6 | Complete |
| CONF-02 | Phase 6 | Complete |

**Coverage:**
- v1.1 requirements: 11 total
- Mapped to phases: 11/11
- Shipped: 11
- Dropped: 0
