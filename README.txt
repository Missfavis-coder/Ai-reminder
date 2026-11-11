AI Reminder workspace UI patch

Extract this archive into your project root and allow it to overwrite the three matching files.

Files changed:
- app/(dashboard)/integrations/page.tsx
- app/(dashboard)/dashboard/page.tsx
- app/(dashboard)/activity/page.tsx

Changes:
- Adds Cursor, Antigravity, and Windsurf to the Integrations provider selector.
- Shows the CLI command for Cursor, Antigravity, and Windsurf rather than manually creating a workspace record.
- Keeps the existing VS Code extension authorization flow.
- Keeps manual Browser workspace registration.
- Groups connected workspaces by provider on Integrations and Dashboard.
- Uses readable provider names in the Activity workspace filter.
- Displays connection status separately from monitoring status.

After extracting, run:
  npm run typecheck
  npm run build
