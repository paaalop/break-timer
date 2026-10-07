# AGENTS.md

## Scope

- Perform only the requested task.
- Do not refactor unrelated code or expand the scope unless it is necessary to complete the task.
- Preserve existing behavior unless the task explicitly requires changing it.

## Project Navigation

- Before broadly searching the repository for the location of a feature or file, check `docs/project-map.md`.
- Use the project map as the starting point for navigation, then inspect the relevant code directly.
- If the map does not contain enough information, explore the repository as needed.
- The project map is a navigation aid, not a source of truth. If it conflicts with the code, trust the code.

## Project Map

- Keep `docs/project-map.md` concise. It should describe where major responsibilities live, not implementation details.
- Update the project map only when a task makes it inaccurate or meaningfully changes the project structure.

Examples that require an update:
- adding, deleting, moving, or renaming an important file
- introducing a new major module, component, store, service, or feature area
- moving a responsibility from one module to another

Minor implementation changes do not require a map update.

## Verification

- After implementation, run verification appropriate to the changed scope.
- Prefer focused checks and relevant tests first.
- Do not run expensive project-wide checks unless they are useful for validating the task.