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

## Nuxt imports (`apps/web`)

`apps/web` mixes auto-import and explicit imports on purpose. The full rationale is in `SPEC.md` → "Auto-import Strategy". The config is the `components` and `imports` blocks in `apps/web/nuxt.config.ts`. `apps/web-next` (Next.js) has no auto-import and always uses explicit imports.

| Code                                                                   | How to use it                                                                                                                |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Vue / Nuxt / module APIs (`ref`, `computed`, `useFetch`, `useI18n`, …) | Auto-imported. Both styles exist in the repo: new code may omit the import, but don't add or remove them in unrelated files. |
| `app/composables/`, `app/utils/`, `app/stores/`                        | Auto-imported.                                                                                                               |
| `app/components/{ui,common,blocks,shell}/`                             | Auto-imported. The tag is the file name: `components/ui/Button.vue` → `<Button>`, never `<UiButton>` (`pathPrefix: false`).  |
| `app/components/ui/alert-dialog/`                                      | Not registered. Import from `./alert-dialog` (only the `ui/AlertDialog.vue` wrapper does this).                              |
| `app/features/<x>/`                                                    | **Never** auto-imported. Import from the barrel: `import { UserTable } from '~/features/user'`. Don't register `features/`.  |
| `app/lib/`                                                             | **Never** auto-imported. Always import explicitly (`api-client`, `auth`, …). Don't register `lib/`.                          |

- Inside `features/` and other non-component modules (anything unit-tested with Vitest), prefer explicit imports, even for auto-imported symbols. Use `#imports` for Nuxt/module APIs (`import { useI18n } from '#imports'`) and `~/composables/...` for shared composables. Follow `app/features/user/composables/useUsers.ts`.
- To find where an auto-imported symbol or component comes from, read the generated `apps/web/.nuxt/imports.d.ts` and `apps/web/.nuxt/components.d.ts`; don't guess. If `.nuxt/` is missing or stale, run `bun run postinstall` (`nuxt prepare`) in `apps/web`.
- A shared component, composable, or helper goes in one of the auto-imported directories above. Don't widen the `components`/`imports` config to make a feature-local symbol global. If two features need it, move it into `components/common/` or `composables/`.
