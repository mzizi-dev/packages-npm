# AGENTS.md — packages-npm

> For any AI agent working in this repository. The repository's guide is [`CLAUDE.md`](./CLAUDE.md): read it first. Despite its name, it applies to every agent. It covers the commands, which files are generated, branches, releases and versioning, the changelog and CI. This file adds only the org's agent rules, which are the same in every Mzizi repository.

## Merge convention

Read off the repo rulesets on 2026-11-03 (`gh api repos/mzizi-dev/<repo>/rulesets`); the rulesets are the authority if this drifts.

- **Merge method.** Squash merges through the merge queue: `gh pr merge <n> --squash --auto`. Never `--admin`. Rebase and merge commits are not how PRs land. Org admins can bypass the rulesets; agents never do.
- **The `staging` queue.** Target config: `merge_method` `SQUASH`, `min_entries_to_merge_wait_minutes` `0`, up to 5 entries built and merged together, grouping `ALLGREEN`, check timeout 60 minutes. The owner applies it in the repo rulesets (agents cannot write them). Until `merge-queue-staging` reads `SQUASH` and `0`, it still rebases and waits 5 minutes: keep every branch **linear** (no merge commits), because a rebase queue drops a branch that carries one with `MERGE_CONFLICT`. `staging` keeps `required_linear_history`, non-fast-forward blocking, 0 required approvals and required thread resolution.
- **The `main` queue.** `MERGE`, no wait. Leave it: a release lands as one squash commit and the trees match.
- **Enqueue as soon as the gate is met** (complete, CI green, verified at runtime, `/code-review` run with findings resolved; see "Dev skills, progress reports and the merge gate" below). Do not park a green PR.
- **Every PR body carries one issue line** for the `issue attached` check: `Refs #n`, `Closes #n` or `No issue: <reason>`. Re-running that check needs the PR closed and reopened or the body edited.
- **Releases.** `main` is released from `staging` by a `release/` branch made of `main` plus `staging`'s exact tree, squashed. Minors and patches release automatically; only a **major** needs the owner's go-ahead (owner, 2026-11-02: "we are about a 1000 minor releases away from deciding v1").
- **Forward-port before you release.** The release-version-check gate fails a release PR while `main` has commits `staging` lacks (the registry-pin bot's commits, usually). Forward-port them to `staging` first, then cut the release. Do not push to the pin bot's branch (`bot/registry-pin`) unless you are taking the bump over.
- **Sync back after a release.** The squash commit on `main` is never in `staging`'s history. If the trees differ, open a sync PR into `staging` from a branch off `staging` with `origin/main` merged in, squashed. Compare trees (`git diff origin/main origin/staging`), not commit counts.

## Release notes (hard rule)

Owner, 2026-11-04: "Every release should have release notes too with a changelog."

- **Every package release carries notes built from `CHANGELOG.md`**: the
  `## [<name> <version>] - <date>` section, the package name and version, its npm link and a
  "Full changelog" compare link (`scripts/release-tags.mjs`). Bumping a `version` therefore
  needs that dated section in the same PR.
- **A version with no section fails the release.** `scripts/release-publish.mjs` refuses it
  before `npm publish`, and `release-tags.mjs` throws rather than write generic notes.
- **Notes are set when the release is created.** `.github/scripts/publish-release.sh` makes a
  draft with the notes and publishes it once; never `gh release edit` a published release.
- **A release PR's body carries the same notes.** Before merging a `release/` PR into `main`,
  paste the section(s) being released (the `release notes / release PR` job prints them) into
  the PR body.
- `.github/scripts/publish-release.sh` and its test are identical in the other Mzizi
  repositories (agent-tools, mzizi-api, mzizi-docs, mzizi-site, mzizi-registry).

## Dev skills, progress reports and the merge gate

Load the Mzizi **dev skills** before starting work: `mzizi_get_skills category=dev` on the Mzizi MCP (`mcp.mzizi.dev`), or `@nyuchi/mzizi-skills` from npm. They are `digital-hygiene` and `progress-report`.

- **Digital hygiene.** Check free disk before starting, share build caches, and audit, then delete, your clones once the work merges (`digital-hygiene` skill).
- **Clone isolation.** Clone only into a directory unique to you under `${TMPDIR:-/tmp}`, or the session's worktree root in a cloud session; never touch another agent's.
- **Progress reports.** All dev work runs on a 10-minute progress-report loop (`progress-report` skill): measured bars, what changed, and a final "Needs you:" line. Report ticks never publish, release, merge or deploy without the owner's approval.
- **Merge gate.** Merge only when the work is complete, CI is green, it's verified at runtime, and `/code-review` has run with findings resolved.
