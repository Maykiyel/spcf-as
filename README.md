# spcf-as

Accounting system frontend for SPCF: a cashier takes payments and prints an
Acknowledgement Receipt, an admin manages the service catalog, user accounts and
pre-numbered receipt series, and reads the reports and audit trail.

Scope is deliberately limited to Inventory, Transactions and Series Receipts.
Suppliers and Students are handled by a different system SPCF already runs and
were removed rather than deferred; see
[`docs/adr/0001`](docs/adr/0001-remove-suppliers-students.md) before adding
either back.

Vite + React + TypeScript, talking to a Laravel API in a separate repository.

## Running it

```bash
pnpm install
pnpm dev
```

Needs `VITE_APP_API_URL` in `.env`, pointing at the backend's `/api` root
(`http://localhost:8000/api` against a local `php artisan serve`). The app
derives its Sanctum CSRF origin by stripping the trailing `/api`, so that
suffix matters. A missing or malformed value throws at startup rather than
failing later on the first request.

The backend is its own repository and is the source of truth for wire
behaviour. `BACKEND_NOTES.md` transcribes what it actually returns and
enforces, per endpoint.

## Verifying a change

```bash
npx tsc -p tsconfig.app.json --noEmit
npx oxlint src
npx vitest run
```

The suite takes roughly four minutes. There is no formatter in the toolchain
and `prettier` is not a dependency, so match the surrounding style by hand
rather than running one.

## Where things are documented

- **`CONTEXT.md`** — the domain glossary and the coding standard. Read it first
  and in full. Its Language section is what stops two names existing for one
  thing, and its Comments section is enforced in review.
- **`AGENTS.md`** — issue tracker, triage labels, and where domain docs live.
- **`BACKEND_NOTES.md`** — the API, per endpoint: envelope, status codes, sort
  allow-lists, filter surfaces, response shapes, and the gaps still open.
- **`docs/adr/`** — decisions that would otherwise look like oversights.
- **`docs/operations/`** — turnover steps that happen outside the codebase, such
  as the per-workstation printer setup an Acknowledgement Receipt needs.
- **`src/components/ui/README.md`** — the shared UI tier and its one hard rule:
  nothing in it may import from `src/features/*` or `src/app/*`. Oxlint enforces
  that.
