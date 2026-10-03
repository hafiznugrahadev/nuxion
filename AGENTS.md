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
