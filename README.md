# Restart

Начни новую финансовую главу.

Restart — приложение, которое проводит человека через процедуру личного банкротства шаг за шагом:
простым языком, без юридической терминологии, по одному действию на экран. 

## Stack

- **Backend:** Spring Boot 4.1 / Java 21 modular monolith (Spring Modulith), MySQL 8.4, Flyway,
  JWT security, springdoc-openapi, Testcontainers + ArchUnit tests.
- **Frontend:** React 19 + TypeScript + Vite SPA.
- **Local stack:** `docker compose up --build` (MySQL, backend, frontend).

## Quick start

```bash
cp .env.example .env
docker compose up --build
# frontend: http://localhost:3000   backend: http://localhost:8080
```

Development details and conventions: see [CLAUDE.md](CLAUDE.md).
