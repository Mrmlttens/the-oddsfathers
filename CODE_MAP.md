# THE ODDSFATHERS code map

The site is a static app with no production build step. Main serves V1; `/v2/` loads the same root assets and data. Keep `v1-baseline` unchanged.

## Page and appearance

- `index.html`: markup and ordered deferred script links. No embedded application script or stylesheet.
- `site.css`: the original global theme, unchanged by the cleanup.
- `stadium-header.webp`: the exact original stadium header image bytes, extracted from the stylesheet's data URL.
- Feature stylesheets: LiveField, King, celebrations, upcoming games and crew features.

## Browser code

Classic deferred scripts intentionally share the same global scope. Preserve script order in `index.html`; all scripts finish before the registered DOMContentLoaded initializer runs.

- `app-state.js`: shared state, configuration, formatting helpers and startup registration.
- `app-tracking.js`: adapters to the pure grading engines, ticket status, leg labels/progress and archive rules.
- `app-views.js`: ticket rendering, filters, game selection, recent hits, the single render coordinator and tab navigation.
- `app-controller.js`: feed/published-ticket synchronization, user input, refresh timers, export and share.
- `game-model.js` / `scoped-model.js`: the shared pure full-game and period/drive grading engines. The final-results job uses these same engines.
- `king-model.js` / `crew-model.js`: pure scoring and profile calculations.
- `king.js`: standings, scoring audit, wager table and contest-record loading.
- `enhancements.js`: profile/History views, wager summary and feed-health view.
- `livefield.js`, `upcoming.js`, `popup-points.js`, `celebrations-v2.js`: their respective feature views/controllers.

There is one active global implementation for each renderer and celebration handler. Do not restore the retired inline versions or add a wrapper merely to replace an existing renderer.

## Data and checks

- `bets.json`: submitted tickets. Preserve existing IDs, amounts, scopes, targets and timestamps.
- `king.json`: immutable registrations, verified final snapshots and corrections. Scheduled updates are maintained by `scripts/sync-results.cjs` and `.github/workflows/results.yml`.
- `npm test`: model tests, exhaustive scoring combinations and refactor invariants.
- `npm install` then `npm run test:ui`: DOM integration tests.
- `refactor-baseline.json`: exact theme/header fingerprints and cleanup metadata. An approved visual change must deliberately update the relevant fingerprint; routine bet updates must not.

The cleanup does not change scoring, bets, live refresh cadence, cash treatment or the visible design. The legacy preview URL continues to share the current root app.
