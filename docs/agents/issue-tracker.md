# Issue tracker

This repository uses GitHub Issues for tracking work, on
`Maykiyel/spcf-as`.

- Use `gh issue create` / `gh issue edit` for issue management.
- The issue tracker is the source of truth for incoming bugs, feature
  requests, and implementation tasks.
- PRs are not treated as a request surface for triage by default.

## Note for agents: `gh` may not be on `PATH`

The GitHub CLI is installed at `C:\Program Files\GitHub CLI\gh.exe` but is
not always on the `PATH` of an agent's shell — a shell started before the
install won't see it. If `gh` appears to be missing, call it by its full
path before concluding the CLI is unavailable:

```bash
"/c/Program Files/GitHub CLI/gh.exe" issue list
```

## Triage labels must exist before use

The repo carries GitHub's stock labels. Of the five canonical triage
labels only `wontfix` exists by default; `needs-triage`, `needs-info`,
`ready-for-agent` and `ready-for-human` have to be created once with
`gh label create` before any skill can apply them.
