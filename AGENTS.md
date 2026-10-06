# Agent Rules

Standing rules for any AI agent or session working in this repository.

## Agent concurrency — isolate heavy work in its own worktree

Before starting heavy work (multi-file changes, refactors, dependency changes, anything implemented from an approved plan-mode plan), check whether another agent is already working here:

```bash
git worktree list                              # extra worktrees = other tasks in flight
git status --short                             # dirty state this session didn't create
git branch --sort=-committerdate | head -5     # recently active branches besides main
```

If another agent is active — or the shared checkout is dirty with foreign work — do NOT work in the shared checkout. Create an isolated worktree + branch instead:

```bash
git fetch origin
git worktree add ../nuxion-<task-slug> -b <type>/<task-slug> origin/main
```

Commit, build, and open the PR from that worktree; remove it (`git worktree remove ../nuxion-<task-slug>`) after the PR is merged.

If the checkout is clean and no other agent is active, a feature branch in the shared checkout is fine. `main` is protected — all work lands via feature branch + PR (squash-merge) regardless, so the worktree only adds checkout isolation.

## Skills — load before feature work

- **Any CRUD feature** (new resource, endpoint, DTO, admin page, datatable, modal — even one side only): consult the `nuxion-crud` skill first. The repo copy lives at `.agents/skills/nuxion-crud/` (symlinked from `~/.agents/skills/`); when the pattern changes, edit the repo copy in the same PR.
- **Every feature that produces UI** (components, pages, layouts, copy): also load the `antislop` skill before writing code. It is the design-quality filter this repo holds work to (WCAG AA, honest empty/loading/error states, no template AI-slop patterns). Per its core file, ask the user up front whether antislop applies DURING the work or AFTER it as an audit. Sub-skills per concern: `antislop-ui`, `antislop-copywriting`, `antislop-human`, `antislop-layoutmobile`, `antislop-code`.

<!-- antislop:start -->

## antislop

For UI, copy, people, mobile layout, or code comments work, read the antislop core skill (`~/.agents/skills/antislop/SKILL.md`) and then the skill for the task:

- UI / visual: `~/.agents/skills/antislop-ui/SKILL.md`
- Copy & text: `~/.agents/skills/antislop-copywriting/SKILL.md`
- People: `~/.agents/skills/antislop-human/SKILL.md`
- Mobile / responsive: `~/.agents/skills/antislop-layoutmobile/SKILL.md`
- Code comments: `~/.agents/skills/antislop-code/SKILL.md`
  Before starting, ask the user when antislop applies: during the work, or after it is done.

<!-- antislop:end -->
