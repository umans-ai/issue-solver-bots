# Local Dev Runbook

Notes on how we got every developer service running inside the Codex CLI sandbox, including the background log setup and the workaround for Next.js file-watcher limits.

## issue-solver

- **API + web UI (`just dev`)**
  ```bash
  cd issue-solver
  nohup just dev > just-dev.log 2>&1 & echo $! > just-dev.pid
  ```
  - `just-dev.log` captures all stdout/stderr (LocalStack bootstrap, Alembic migrations, FastAPI dev server).
  - `just-dev.pid` keeps the background PID so we can stop it with `kill $(cat just-dev.pid)`.
  - We hit `[Errno 48] Address already in use` on port 8000; freeing the host FastAPI processes (PIDs 18172/18185 at the time) resolved it.
- **Worker queue (`just w`)**
  ```bash
  cd issue-solver
  nohup just w > just-w.log 2>&1 & echo $! > just-w.pid
  ```
  - Writes worker output (SQS poller + lambda shim) to `just-w.log`.
  - Stop via `kill $(cat just-w.pid)`.

## conversational-ui

Running `just dev` here required two tweaks:

1. **Port conflict** – another Node process already bound to 3000 in the sandbox. Next.js automatically moved to 3001, so we pointed the browser/curl to `http://localhost:3001`.
2. **Too many file watches (EMFILE)** – Turbopack’s default watcher exhausted the sandbox FD limit, causing every route to 404. Switching Watchpack to polling fixes it:

```bash
cd conversational-ui
rm -f just-dev.log just-dev.pid
WATCHPACK_POLLING=true WATCHPACK_POLLING_INTERVAL=200 \
  nohup just dev > just-dev.log 2>&1 & echo $! > just-dev.pid
```

- Logs land in `conversational-ui/just-dev.log`, PID in `just-dev.pid`.
- Stop it with `kill $(cat just-dev.pid)`.
- Verify readiness with `curl -I http://localhost:3001/` (NextAuth redirects to `/login`, confirming the middleware runs).

These steps keep all three long-running services alive with tailable logs while we keep working in the CLI. Adjust the polling interval or switch back to normal watchers if you are on a host without the EMFILE constraint.

### Test accounts for Playwright/E2E testing

For automated testing, use the seeded test accounts:

```bash
cd conversational-ui
just seed-test
```

This creates or resets three test users (all with password `test123`):

| Email | Type | Use Case |
|-------|------|----------|
| `playwright-test@umans.local` | Basic user | General testing |
| `test-code-pro@umans.local` | Code Pro subscriber | Test billing dashboard, API keys |
| `test-code-max@umans.local` | Code Max subscriber | Test unlimited plan features |

All accounts are pre-verified with a default space and active subscriptions (for code offer users), ready for immediate login.

Access the code offer dashboard at: `http://localhost:3000/billing`

### Creating a throwaway UI account (no email service)

For manual testing when you need a fresh account, you can create one without email verification. Because the sandbox cannot receive email, we verified accounts manually:

1. **Register through the UI** – browse to `http://localhost:3001/register`, submit an email/password (example: `codex.agent+ts1@example.com` / `CodexTest123!`). The app creates the user but marks it as unverified.
2. **Grab the verification token from Postgres** – the `conversation-ui` stack exposes Postgres as `postgres-umansuidb`. Run:
   ```bash
   docker exec postgres-umansuidb \
     psql -U user -d umansuidb \
     -c 'select "email","emailVerificationToken" from "User";'
   ```
   Copy the long token for the email you just registered.
3. **Manually hit the verification API** – call the local endpoint so the account flips to verified:
   ```bash
   curl -s -X POST http://localhost:3001/api/auth/verify \
     -H 'Content-Type: application/json' \
     -d '{"token":"<copied token>"}'
   ```
   You should receive `{"message":"Email verified successfully"}` and can now log in at `/login`.

After logging in, click **New Chat**, type a message (e.g., `hi`), and send it via the round arrow button to confirm the end-to-end UI flow.

## E2E Development (Cross-Project Testing)

When testing features that span both `conversational-ui` and `issue-solver` (e.g., wiki generation where the worker writes and the UI reads), use the root-level E2E orchestration.

### Quick Start

```bash
# From repository root
just e2e-dev        # Start everything (shared S3, both apps, worker)
just e2e-logs       # Tail all logs
just e2e-stop       # Stop everything
```

### Available Recipes

| Recipe | Description |
|--------|-------------|
| `just e2e-dev` | Start full environment (MinIO, LocalStack, databases, UI, API, worker) |
| `just e2e-services` | Start only shared services (MinIO + LocalStack) |
| `just e2e-databases` | Start only project databases (Postgres + Redis for each) |
| `just e2e-logs` | Tail all logs |
| `just e2e-logs-ui` | Tail UI logs only |
| `just e2e-logs-api` | Tail API logs only |
| `just e2e-logs-worker` | Tail worker logs only |
| `just e2e-status` | Show what's running |
| `just e2e-stop` | Stop all services |
| `just e2e-clean` | Stop + remove logs |
| `just e2e-destroy` | Stop + remove logs + delete data volumes |
| `just e2e-seed-test` | Create test user for Playwright |

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Shared Services                          │
│  ┌─────────────────────┐    ┌─────────────────────┐        │
│  │   MinIO (S3)        │    │   LocalStack (SQS)  │        │
│  │   Port: 9000        │    │   Port: 4566        │        │
│  │   Console: 9001     │    │                     │        │
│  └─────────────────────┘    └─────────────────────┘        │
│            ▲                          ▲                     │
│            │ read/write               │ events              │
│            │                          │                     │
├────────────┼──────────────────────────┼─────────────────────┤
│            │                          │                     │
│  ┌─────────┴───────────┐    ┌────────┴────────────┐        │
│  │  conversational-ui  │    │    issue-solver     │        │
│  │  Port: 3000         │    │    API: 8000        │        │
│  │  Postgres: 5432     │    │    Postgres: 55432  │        │
│  │  Redis: 6379        │    │    Redis: 63799     │        │
│  └─────────────────────┘    │    Worker           │        │
│                             └─────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

**Shared S3 bucket:** `conversational-ui-blob`
- Worker writes wiki content: `base/{kbId}/docs/{sha}/...`
- UI reads wiki content from the same location

### When to Use E2E Mode

**Use E2E mode for:**
- Testing wiki/auto-doc generation end-to-end (worker writes → UI reads)
- Testing any feature involving cross-project S3 access
- Verifying integration between conversational-ui and issue-solver

**Use project-specific `just dev` for:**
- Unit tests or isolated feature development
- UI-only or backend-only changes
- Quick iteration

### Logs Location

All logs are stored in `.e2e-logs/` at the repository root:
- `.e2e-logs/ui.log` — conversational-ui output
- `.e2e-logs/api.log` — issue-solver API output
- `.e2e-logs/worker.log` — issue-solver worker output

### Test Account

For Playwright/E2E testing, seed the test user:

```bash
just e2e-seed-test
```

Credentials: `playwright-test@umans.local` / `test123`

## Preview testing playbook (app.pr-XXX.umans.ai)

When a PR deploys to the preview stack, we can exercise it without re-doing auth every time:

1. **Preview URLs**  
   - UI: `https://app.pr-<PR_NUMBER>.umans.ai`  
   - API: `https://api.pr-<PR_NUMBER>.umans.ai`  
   (See `.github/workflows/cd-workflow.yml`: the workspace/tag is `pr-${number}`.)

2. **Reuse an existing login**  
   - Ask a teammate (or yourself) to log into the preview UI once in the shared browser profile.
   - In the CLI sandbox we have to use Playwright’s `~/Library/Caches/ms-playwright/mcp-chrome` profile, so before driving it, kill any leftover instances:  
     ```bash
     pkill -f mcp-chrome || true
     ```
   - Launch Playwright again; since the profile now contains the authenticated cookies, the preview app loads already signed in.

3. **Exercise the relevant feature**  
   - If the PR touches repo-aware features (docs prompts, chat tooling, etc.), connect a repository from the header’s **Connect Repository** dialog. Prefer a small public repo so indexing finishes quickly; wait for the Git icon to show “indexed” before testing.
   - Navigate straight to the area under test—for example `https://app.pr-<PR>.umans.ai/docs/<KB_ID>` for auto docs, `/chat/<chatId>` for conversation flows, or whatever route the UI exposes.
   - Drive the scenarios exactly as a user would (submit forms, trigger `/api/repo/sync`, call new endpoints via the console, etc.) and confirm the UI updates as expected.
   - When helpful, hit the preview API (`https://api.pr-<PR>.umans.ai/...`) to inspect JSON responses or process status while the feature runs.
