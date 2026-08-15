# Deploying Рестарт to Railway

Three services in one Railway project: **MySQL** (managed), **backend** (this repo's root
`Dockerfile`), **frontend** (`frontend/Dockerfile`). Config-as-code lives in `railway.json`
(backend) and `frontend/railway.json` (frontend) — builder and health checks are picked up
automatically; only variables and domains are set in the console.

> Secrets are set directly in Railway's Variables UI and never committed. Generate each JWT
> secret locally with `openssl rand -base64 48`.

## 1. Project + MySQL

1. Railway → **New Project** → **Deploy MySQL**.
2. Rename the service to `mysql` (service names are referenced in variables below — if you keep a
   different name, adjust the `${{mysql.…}}` references accordingly).

## 2. Backend service

1. **+ New → GitHub Repo** → select `GalinaBP/Restart`.
2. Service settings:
   - **Root directory**: `/` (default). Railway reads `railway.json` → Dockerfile build, health
     check `/actuator/health`.
3. **Variables** (Raw editor is fastest):

   ```
   SPRING_PROFILES_ACTIVE=prod
   DB_URL=jdbc:mysql://${{mysql.MYSQLHOST}}:${{mysql.MYSQLPORT}}/${{mysql.MYSQLDATABASE}}?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
   DB_USERNAME=${{mysql.MYSQLUSER}}
   DB_PASSWORD=${{mysql.MYSQLPASSWORD}}
   JWT_ACCESS_SECRET=<openssl rand -base64 48>
   JWT_REFRESH_SECRET=<openssl rand -base64 48, a DIFFERENT value>
   CORS_ALLOWED_ORIGINS=<set after step 3 — the frontend's https:// domain, no trailing slash>
   ```

   Notes:
   - The two JWT secrets must be different values, each ≥ 32 bytes — the app refuses to boot
     otherwise (deliberate fail-fast).
   - `useSSL=false` is for Railway's private network between backend and MySQL;
     `allowPublicKeyRetrieval=true` is required by MySQL 8's default auth plugin without SSL.
4. **Settings → Networking → Generate Domain**. Note the URL — it is the API host
   (e.g. `https://restart-backend-production.up.railway.app`).
5. First deploy: Flyway applies `V1…V3` automatically at startup (`ddl-auto: validate` only
   checks the schema afterwards). Watch the deploy logs for `Successfully applied 3 migrations`.

## 3. Frontend service

1. **+ New → GitHub Repo** → same repo `GalinaBP/Restart`.
2. Service settings → **Root directory**: `frontend`. Railway reads `frontend/railway.json`.
3. **Variables**:

   ```
   VITE_API_BASE=https://<backend domain from step 2.4>/api/v1
   ```

   This is consumed at **build** time (declared as `ARG` in `frontend/Dockerfile`) and baked into
   the SPA bundle — changing it requires a redeploy, not just a restart.
4. **Settings → Networking → Generate Domain**, and set the **target port to 80** (nginx listens
   on 80; Railway's port autodetection can otherwise guess wrong for Docker images).
5. Go back to the backend's variables and set `CORS_ALLOWED_ORIGINS` to this frontend domain
   (scheme + host, e.g. `https://restart-production.up.railway.app`) — the backend redeploys and
   the SPA can call the API.

## 4. Smoke test

- `https://<backend>/actuator/health` → `{"status":"UP"}`
- `https://<backend>/swagger-ui.html` → **404** (must be disabled in prod)
- Open the frontend domain → the eligibility check flow works end-to-end (it is anonymous);
  register/login exercises MySQL + JWT.

## Private beta: closing the app to outsiders

Two independent locks, both toggled by env variables only (no code changes, ~1 min each):

1. **Frontend browser login** (nobody even sees the site without a password). Frontend service →
   Variables:

   ```
   BASIC_AUTH_REALM=Restart
   BASIC_AUTH_USERS=<one htpasswd line, see below>
   ```

   Generate the value locally (pick your own name and password):

   ```bash
   printf 'galina:%s\n' "$(openssl passwd -apr1 'ТВОЙ-ПАРОЛЬ')"
   ```

   Paste the full output (`galina:$apr1$...`) as `BASIC_AUTH_USERS`. Apply → the site asks for
   this login in the browser. **Reopen later**: set `BASIC_AUTH_REALM=off` (or delete both vars).

2. **Registration switch** (nobody can create an account, not even via the API; existing logins —
   yours — keep working). Backend service → Variables:

   ```
   REGISTRATION_ENABLED=false
   ```

   Sign-up attempts get 403 «Регистрация пока закрыта…». **Reopen**: set to `true` or delete.

> Make sure you already have your own account BEFORE setting `REGISTRATION_ENABLED=false`
> (register once through the UI if needed, then flip the switch).

## Password-reset emails

`POST /api/v1/auth/forgot-password` mails a single-use link (valid one hour). Where the letter
actually goes depends on backend variables:

- **No SMTP configured (default)**: the link is written to the backend deploy logs instead —
  search the logs for `reset link`. Fine for the private beta; the operator passes it on by hand.
- **Real email**: set standard Spring mail variables on the backend service and redeploy:

  ```
  SPRING_MAIL_HOST=smtp.example.com
  SPRING_MAIL_PORT=587
  SPRING_MAIL_USERNAME=<smtp user>
  SPRING_MAIL_PASSWORD=<smtp password / app password>
  SPRING_MAIL_PROPERTIES_MAIL_SMTP_AUTH=true
  SPRING_MAIL_PROPERTIES_MAIL_SMTP_STARTTLS_ENABLE=true
  MAIL_FROM=<sender address; defaults to SPRING_MAIL_USERNAME>
  ```

  Any provider with SMTP works (Yandex 360, Mail.ru, Resend, Brevo, …).
- The link points at the first `CORS_ALLOWED_ORIGINS` entry (= the frontend domain); set
  `FRONTEND_BASE_URL` only if that ever stops being right.

## Ongoing

- Every push to `main` redeploys both services (Railway watches the repo). Since GitHub Actions CI
  also runs on `main`, consider enabling **branch protection** so only green PRs merge — Railway
  then only ever deploys tested code.
- A 127-ФЗ template edition bump (`rules/doctemplates/manifest.yml`) or a `rules/sections.yml` change
  ships like any other commit: edit the yml, `npm run rules`, PR → merge → auto-deploy. Both are
  built into the frontend bundle, so it is the **frontend** service that has to redeploy for a rule
  change to reach anyone. No console work.
- Scaling/cost: both services fit Railway's smallest instances; MySQL is the only stateful piece.

## Local parity

`docker compose up --build` remains the local equivalent (same Dockerfiles, same env contract via
`.env`). The `prod` profile is never used locally; Railway is the only place it runs.
