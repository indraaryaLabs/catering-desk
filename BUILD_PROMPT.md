# OpenCode Builder Prompt — Catering Desk

You are the sole implementation agent for **Catering Desk**, an MVP in the SatuArah portfolio. Read `PRD.md`, `ACCEPTANCE_CHECKLIST.md`, `../../shared/DESIGN_SYSTEM.md`, and `../../shared/REFERENCES.md` first. Then implement the app fully; do not stop at planning or static mockups.

## Execution mode: speed with scope discipline
1. Inspect the folder and environment. If empty, scaffold a standalone Vite + React + TypeScript app here. Do not alter files outside `projects/03-catering-desk/`.
2. Follow the PRD exactly. Build the smallest complete version that meets it. **Do not ask for permission or clarification for reasonable small decisions**; make a sensible choice and document it.
3. Use realistic seeded data so the main dashboard and workflows look finished immediately. The UI language must be natural Bahasa Indonesia.
4. Follow `../../shared/DESIGN_SYSTEM.md` for a premium, non-generic visual result. Use `../../shared/REFERENCES.md` to learn workflow patterns, not to copy UI or branding.
5. Implement real interactions, validation, persistence, reset demo, and import/export where required. Do not leave placeholder buttons or fake dashboard figures.
6. Keep dependencies and code simple. No paid services, API keys, backend, login, external runtime assets, or unrequested integrations.
7. Write business logic as testable functions. Add focused tests for the highest-risk rules if the setup permits; at minimum verify them with a deterministic test/manual checklist.
8. Run dependency install if needed, typecheck/lint/tests if configured, and production build. Fix failures caused by your changes. If a command cannot run, report the exact reason instead of pretending it passed.
9. Review the browser UI at desktop and mobile widths if browser tools are available. Otherwise inspect responsive styles and note that visual browser testing was not performed.
10. Update `ACCEPTANCE_CHECKLIST.md` honestly and write `README.md` with run instructions, features, limitations, and test evidence.

## Stop conditions
- Do not add features outside the PRD.
- Do not refactor shared workspace files or another app.
- Do not run Git push, delete source files, perform cleanup, or commit unless explicitly requested in a later instruction.
- Do not state that all bugs are impossible or eliminated. Summarize completed work, tests actually run, known limitations, and exact commands to run the app.

## Final response format
1. Implemented features
2. Files/structure created
3. Commands run and exact outcomes
4. How to run locally
5. Known limitations or unverified checks
6. Checklist status

Begin now and continue until the MVP meets its definition of done.
