# Living World: Awakened — Alpha 3

An entirely free, Android-oriented single-player fantasy god simulator.

## What changed from Alpha 2

- Reworked visible HUD: small character card, compact Fate/Magic/History dock, one world-activity headline, border map toggle.
- Original procedural cartoon demigod character artwork: spiky hair, horns, crown, bold outlines, magical eyes, swagger, and four aura palettes. Character creation choices still change the portrait.
- Animated trade routes and marching troops between real capitals, settlement lights, ambient weather, and recent-event map pulses. Animations are purely visual; settlement populations and territory are still driven by the real simulation.
- Fate decisions tied to actual conditions such as food, stability, migration, politics, and realm expansion. Choices change tracked resources, army numbers, population, hybrid communities, or city construction, and are recorded in the Chronicle.
- Event headlines now open explanations with location focus where applicable, rather than just announcing event titles.
- Meaningful time-skip summary: population growth, border change, and number of recorded events.
- Existing Alpha 2 save storage keys retained. No reset or data migration expected, but keep backups for safety.

## Playing

Open `index.html` under a static web server (e.g. GitHub Pages) for local saves and optional PWA caching. Alternatively `PLAY.html` is a complete standalone browser file, with all CSS and JS inlined. Browser file support varies by Android vendor/app.

1. Choose a demigod appearance, an aura, a name, and a patron kingdom.
2. Tap **FATE** for immediate decisions. The first event welcomes travelers to your kingdom.
3. Watch and spin the globe. Tap territory to inspect and use **Powers** to claim land and shape history.
4. Use speeds or **+YRS** to see cause and effect, and open the world-event headline for the historical explanation.
5. Use the upper-right menu to save, export/import a backup, or start a new world.

## Technical boundaries

Runs locally, no paid APIs, backend, or paid AI. Uses WebGL where supported and a Canvas fallback. Runtime state is in browser localStorage with manual JSON export/import. The visual small-scale citizens and game events remain simplified; this is **not** a complete animated planetary population or a finished full-scale strategy game. The additional atmosphere does not imply per-unit simulation on every trade route.

## Testing

- `node --check game.js` passed.
- Model regression script `test_model.js` passed: starting world, human-driven Fate population change, 1,000-year evolution, 6 founding realms, emergent lineages, and save-state JSON round trip.
- The browser refused navigation to local test URLs due to administrator URL policy. An isolated in-memory Chromium run nevertheless verified **character creation, portrait, Fate screen, choice consequences, 50-year jump, UI event headline, save and reload**, without page errors. This is a browser UI test, not a real Android-device verification.
- Existing Alpha 2 code is preserved separately; Alpha 3 is a distinct release.

Copyright: original game code and procedural vector artwork built for this project.