# Crew Intel release — October 26, 2026

- Replace first-ten scoring slots with the saved accuracy formula: `100 * hits / max(5, graded) + min(5, hits)`, up to 105 CP. Every unique, pregame, original prediction counts. Pending/void excluded; live scores provisional. Season uses the mean of final weeks, with three qualifying five-pick weeks required for a season title.
- Add Profiles: cosmetic XP/ranks, final unique-leg accuracy, ticket W/L and ratio, submission-order leg streaks, longest winning parlay, one-leg heartbreaks, biggest priced winning return, signature/toughest players, market splits, and earned medals.
- Add one closest-to-cash ticket per active member, with remaining targets and a link to the card. Progress is not a win probability.
- Restrict expandable History to completed tickets; filter by member and result; retain all original legs and game dates.
- Separate confirmed wager totals and feed-estimated money performance from placeholder wagers and unverified placement. Unknown wagers default to $5, visibly estimated.
- Preserve immutable registrations, source-verified final ESPN grades and compact game/stat snapshots. Track corrections; retain saved grades on feed failures. A shared pure engine grades client and snapshot results consistently.
- Add per-game feed freshness and partial-outage indicators; live summaries refresh every 30 seconds while the page is visible.
- Schedule final-result verification every 15 minutes during NFL game windows through GitHub Actions, with no-change runs avoiding commits/deployments. Scheduled starts can be delayed by GitHub. Final missing player stats remain under review; sportsbook settlement is separate.
- Keep the legacy /v2/ URL on the same app/assets/data. Preserve all bets, the stadium theme/header, and v1-baseline branch.

## Validation

`npm test` runs pure scoring/tracking/cash tests, including 131,071 exhaustive result combinations. `npm install` then `npm run test:ui` runs DOM integration checks for navigation, profiles, History, filters, saved results during feed failures and ticket links. The UI test uses synthetic live feed responses plus saved final snapshots and does not require a sportsbook account. Run `npm run sync:results` to verify and persist available final results from ESPN. No bets are placed by this app.
