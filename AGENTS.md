# AGENTS.md — packages-npm

> For any AI agent working in this repository. The repository's guide is [`CLAUDE.md`](./CLAUDE.md): read it first. Despite its name, it applies to every agent. It covers the commands, which files are generated, branches, releases and versioning, the changelog and CI. This file adds only the org's agent rules, which are the same in every Mzizi repository.

## Dev skills, progress reports and the merge gate

Load the Mzizi **dev skills** before starting work: `mzizi_get_skills category=dev` on the Mzizi MCP (`mcp.mzizi.dev`), or `@nyuchi/mzizi-skills` from npm. They are `digital-hygiene` and `progress-report`.

- **Digital hygiene.** Check free disk before starting, share build caches, and audit, then delete, your clones once the work merges (`digital-hygiene` skill).
- **Clone isolation.** Clone only into a directory unique to you under `${TMPDIR:-/tmp}`, or the session's worktree root in a cloud session; never touch another agent's.
- **Progress reports.** All dev work runs on a 10-minute progress-report loop (`progress-report` skill): measured bars, what changed, and a final "Needs you:" line. Report ticks never publish, release, merge or deploy without the owner's approval.
- **Merge gate.** Merge only when the work is complete, CI is green, it's verified at runtime, and `/code-review` has run with findings resolved.
