# THE ODDSFATHERS project rules

## Approved V1 progress-bar exception
Trey explicitly approved publishing live progress bars under expanded bet legs on October 22, 2026 (Eastern time), and then asked to reopen changes for that update. This specific V1 improvement may be published on main. Its scope is limited to progress-bar styling, the progress calculation helper, and expanded-leg markup. Preserve all unrelated V1 visuals and behavior, all bets, and the v1-baseline snapshot. The remaining rules below continue to apply.

## Approved Version 1 baseline
Trey approved this current site as Version 1 on October 22, 2026 (Eastern time). The v1-baseline branch preserves this release. Keep that branch unchanged as a recovery snapshot.
The entire Version 1 visual design is frozen: header composition, helmet artwork, palette, typography, spacing, cards, navigation, mobile layout, and celebrations. Routine data updates must not change any of these. Any visual revision requires an explicit request from Trey; develop a new version on a separate branch and publish only when instructed.
Before changing code, read these rules and fetch the current files. Preserve all existing bets. Bet updates belong in bets.json only.
This is a project maintenance rule, not a GitHub permission or branch-protection setting.


## Fixed approved identity
Trey controls this public NFL tracker. Preserve the entire existing cinematic dark stadium theme, header artwork, typography, layout, and color palette. Do not regenerate or restyle the website during bet updates. Visual changes require an explicit request from Trey.
Always feature all four crew teams in the header: Washington Commanders, Dallas Cowboys, New England Patriots, Pittsburgh Steelers. Feature them through the existing background helmet artwork only. Do not add team-name labels, logo cards, badges, or a team list to the header. Preserve the title over the cinematic artwork on mobile and desktop. The stadium artwork also contains all four teams: preserve its full horizontal composition. Do not use cover or auto-height sizing that crops Washington or Pittsburgh off the sides on mobile. Keep the mobile artwork above the main title with enough vertical room.
These are permanent crew teams, independent of the current matchup, ticket owners, scores, or selected filters.
Preserve the current global CSS color values in index.html and the four team accent colors. Preserve all other UI styles unless Trey explicitly requests a change.
## Bet operations
Routine ticket updates change bets.json only. Fetch the current file first, preserve existing tickets and exact thresholds, and label placeholder stakes and unconfirmed slips. Never fabricate bets or results. Do not replace index.html to add tickets.
Public visitors remain view-only. Trey manages entries through ChatGPT.
## Development
Keep the existing GitHub Pages address. Experimental versions belong on a separate development branch; main serves the live site. Do not merge experiments without Trey's instruction.
