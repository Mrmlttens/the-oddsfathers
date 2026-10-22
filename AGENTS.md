# THE ODDSFATHERS project rules

## Fixed approved identity
Trey controls this public NFL tracker. Preserve the entire existing cinematic dark stadium theme, header artwork, typography, layout, and color palette. Do not regenerate or restyle the website during bet updates. Visual changes require an explicit request from Trey.
Always feature all four crew teams in the header: Washington Commanders, Dallas Cowboys, New England Patriots, Pittsburgh Steelers. Keep each team's name, logo, and color accent visible on mobile and desktop. These are permanent crew teams, independent of the current matchup, ticket owners, scores, or selected filters.
Preserve the current global CSS color values in index.html and the four team accent colors. Preserve all other UI styles unless Trey explicitly requests a change.
## Bet operations
Routine ticket updates change bets.json only. Fetch the current file first, preserve existing tickets and exact thresholds, and label placeholder stakes and unconfirmed slips. Never fabricate bets or results. Do not replace index.html to add tickets.
Public visitors remain view-only. Trey manages entries through ChatGPT.
## Development
Keep the existing GitHub Pages address. Experimental versions belong on a separate development branch; main serves the live site. Do not merge experiments without Trey's instruction.
