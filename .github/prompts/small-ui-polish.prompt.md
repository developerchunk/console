---
name: small-ui-polish
description: Apply focused UI polish updates to existing screens without changing business logic.
argument-hint: What small UI changes should be applied?
agent: agent
---
Apply small, high-impact UI refinements to the current screen(s) while preserving all API contracts and behavior.

## Inputs
- User-provided tweak list (examples: clickable labels, icon-only actions, rounded controls, remove duplicate controls).
- Current selected file and adjacent related components.

## Rules
- Do not change auth, API endpoint paths, or data flow unless explicitly requested.
- Prefer minimal diffs and preserve existing visual language.
- Replace textual/emoji affordances with consistent SVG icons when requested.
- If a control is duplicated, keep the better-placed control and remove the duplicate.
- Maintain accessibility: add `title` / `aria-label` for icon-only controls.
- After edits, run error checks on touched files and fix any introduced issues.

## Output Format
- Summarize exactly what changed.
- List touched files.
- Mention whether errors were found.

## Examples
- /small-ui-polish "make screen names clickable instead of edit button"
- /small-ui-polish "replace back text button with icon button"
- /small-ui-polish "remove duplicate search control and keep header one"
