# Moviestr project instructions

Before changing application code, read `docs/README.md` and the linked specification for the area being changed.

## Required conventions

- Use Vue 3, TypeScript, Composition API, and `<script setup lang="ts">`.
- Keep TypeScript strict. Do not introduce `any`; validate unknown external data before use.
- Follow the shortened FSD dependency direction: `app -> pages -> features -> shared`.
- Use Setup Stores for Pinia. Keep local UI state in the component or its composable.
- Keep Pinia stores in `shared/stores`, the router in `app`, and static application assets in `shared/assets`.
- Keep component CSS in a neighboring file with the same PascalCase basename and connect it with `<style scoped src="./ComponentName.css"></style>`.
- Put shared HTTP infrastructure in `shared/api` and feature-specific API calls inside the feature slice.
- Use named exports except where a framework requires a default export.
- Use the configured aliases for cross-slice imports and relative imports inside one module.
- Follow `@afpia/eslint` and `@afpia/prettier`; do not add competing formatters or linters.
- Add or update Vitest tests for business logic and Vue Test Utils tests for component behavior.
- Run `yarn validate` and `yarn build` before considering implementation work complete.

Product behavior, API contracts, naming rules, and acceptance criteria are documented in `docs/` and are normative.

## Git workflow

- After every complete, meaningful unit of work, stage only the related files and create a commit.
- Do not combine unrelated features, fixes, documentation, and tooling changes in one commit.
- Do not commit investigation-only changes or a knowingly broken intermediate state.
- Commit messages must pass `@afpia/commitlint` and follow `docs/git-workflow.md`.
- Keep `type` and `scope` technical, but write the commit subject in Russian as a genitive noun phrase.
- Use `yarn commit` for an interactive valid message, or write the valid message directly.
- Run checks proportional to the change before committing; run `yarn validate` for application or tooling changes.
- Do not amend, squash, rewrite, or remove existing commits unless the user explicitly requests it.
