# Domain docs

This repository uses a single-context layout.

- Root `CONTEXT.md` holds the repo-wide domain and architecture context.
- `docs/adr/` holds architecture decision records.
- `docs/operations/` holds deployment/turnover procedures that must happen
  outside the codebase (e.g. per-workstation printer setup). Nothing in
  `git` enforces these, so they're easy to miss — check here before
  concluding a hardware-adjacent bug is a code bug.
- `docs/research/` holds investigation records kept for their reasoning, not
  as instructions. Each states its own outcome up front.
- Agents should read `CONTEXT.md` and relevant ADRs before making changes or
  writing implementation plans.
