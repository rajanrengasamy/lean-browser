# lean-browser 0.3.0 Release Notes

Release date: 2026-02-09

## Highlights

- Added MCP action and session tooling for end-to-end browser automation.
- Hardened navigation security with redirect-aware SSRF validation.
- Fixed token budget handling so tight limits are enforced correctly.
- Fixed text snapshot mode handling in MCP/CLI paths.
- Improved browser/session reliability and process lifecycle behavior.

## New Capabilities

- MCP tool expansion from fetch-only to full interaction set:
  - `execute_browser_action`
  - `take_screenshot`
  - `browser_session_start`
  - `browser_session_execute`
  - `browser_session_snapshot`
  - `browser_session_close`
  - `browser_session_list`
- Action DSL supports:
  - `click`, `type`, `select`, `submit`, `wait`, `navigate`, `scroll`

## Fixes Included in 0.3.0

- One-shot fetch lifecycle:
  - `fetchRenderedHtml` now defaults to `usePool: false` to avoid long-lived process hangs in CLI/test contexts.
- Browser pool isolation:
  - Pooled instances reset context/page on release to prevent request-to-request state leakage.
- Snapshot parsing:
  - Text-mode snapshots no longer crash handlers that expected JSON.
- Token budgets:
  - Truncation paths now honor strict budgets (including tiny budget edge cases).
- SSRF hardening:
  - Final redirect URL is validated, not only the initial input URL.
- Session data URL support:
  - `data:` remains blocked by default; selectively allowed in controlled session-start flow.
- Action parsing:
  - Improved comma-delimited parsing so `type` values can contain commas.
- Version metadata consistency:
  - CLI and MCP server now report `0.3.0`.

## Behavioral Changes to Know

- Pooling is explicit for one-shot programmatic fetches (`usePool: true`), instead of implied by defaults.
- Interactive pages with minimal readable text are handled more gracefully in extraction/session flows.

## Upgrade Notes

- Install/update browsers if needed:

```bash
npx playwright install chromium
```

- Re-run validation:

```bash
npm run lint
npm test
```
