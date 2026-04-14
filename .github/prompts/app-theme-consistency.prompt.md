---
description: "Apply Projects page visual theme to in-app pages with consistent layout, controls, and interactions"
name: "App Theme Consistency"
argument-hint: "Target pages/components and any extra UX controls to include"
agent: "agent"
---
Use the Projects page as the design source of truth and apply the same theme language to app-internal pages (especially app detail and screen editor).

Requirements:
1. Match visual style with [ProjectsPage](./src/pages/ProjectsPage.jsx):
- color palette
- card surfaces and borders
- typography scale and spacing rhythm
- button shape, hover, and focus states
2. Keep existing behavior intact while improving UI consistency.
3. Add or preserve advanced editor UX where applicable:
- undo/redo controls
- in-file search/find
- codebase search for screen-related content
- preview modes for multiple device sizes (mobile/tablet/desktop)
4. Reuse existing patterns from [Layout](./src/components/Layout.jsx), [ProjectDetailPage](./src/pages/ProjectDetailPage.jsx), and [ScreenEditorPage](./src/pages/ScreenEditorPage.jsx) before introducing new patterns.
5. Keep accessibility in mind:
- maintain readable contrast
- ensure keyboard reachable controls
- keep clear disabled states

Implementation expectations:
1. Provide concrete file edits, not just suggestions.
2. Preserve existing API contracts and store behavior.
3. Avoid unrelated refactors.
4. Return a short change summary with:
- files updated
- feature-level UI changes
- any follow-up QA checks to run

Input to use:
- If I specify pages/components, prioritize those.
- If I do not specify targets, default to:
- [src/pages/ProjectDetailPage.jsx](./src/pages/ProjectDetailPage.jsx)
- [src/pages/ScreenEditorPage.jsx](./src/pages/ScreenEditorPage.jsx)
- related components used by those pages.
