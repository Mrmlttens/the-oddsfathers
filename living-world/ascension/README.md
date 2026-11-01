# LIVING WORLD: ASCENSION — Alpha 2 Rewrite

A $0, Android-first, single-player god/civilization simulator. The player starts as a young demigod, creates their appearance, chooses a patron realm, expands its territory and levels up toward godhood. The world advances independently and can be fast-forwarded without waiting.

## Start playing

- **Recommended:** open the hosted GitHub Pages version when available. Hosting keeps your browser save associated with a stable web address.
- **Offline alternative:** extract `Living-World-Ascension.zip`, then open `PLAY.html` in an Android browser that supports local HTML files, or serve the folder as a static site. Local file handling and saving vary by browser.
- `index.html` + `style.css` + `game.js` is the web-hosted PWA version. `PLAY.html` is a self-contained single-file alternative.

## What's actually implemented

- Exactly **one Persistent World** (Sandbox removed).
- Create a named demigod with selectable skin color, hair color, hairstyle/horns, and divine aura; choose the human, elven, dwarven, orcish, fae, or halfling realm you will guide.
- Demigod **leveling, XP, unlockable powers, and four meaningful attributes** (Might, Wisdom, Creation, Dominion).
- Rotatable, pinch-zoomable globe with mouse drag, wheel zoom, tap-to-inspect, and double-tap to zoom. Dragging right/down moves the planet right/down. A **displaced WebGL spherical mesh** provides physical mountain relief on supported GPUs; the CPU renderer provides a rotatable 2D fallback when WebGL is not available.
- Procedural continent terrain and 90–105 province regions; realm boundaries colored directly onto globe geometry, with interior district lines and province conquest.
- Local zoom shows animated roads, houses, towers, farmland, trees, and miniature moving inhabitants (stylized illustration layer, not full 3D-character simulation).
- Kingdom population, food, armies, gold, diplomacy pressure, spontaneous territorial growth, wars, city development, and mortal ruler succession.
- Hybrid-demographic percentages and emerging named lineages; rare alien encounter history.
- Nine god powers, including visible ground effects; some require level-ups and catastrophic powers request confirmation.
- Independent simulation speeds, pause, 1/10/100× and 1/10/50/200/1000/3000-year jumps. Catch-up calculation after time away (capped at 400 years per return for stability).
- Chronicle, realm dossiers, province details, and dynamic guidance objective.
- Three local save slots, autosaving, new game, JSON export/import backups. Stored using localStorage on that browser+origin.
- Self-contained procedural art and logic: no paid libraries, services, ads, subscriptions, remote art, or AI API calls.

## Important limitations

This is an **Alpha rewrite**, not a finished commercial release. It has simplified genetics and citizen representations. Individuals aren't yet fully selectable AI-driven agents. Warfare and diplomacy are aggregate systems, alien civilizations are event-based, and terrain detail at extreme zoom is procedural. The WebGL mesh code is included but was **not physically verified on an Android device**. Browser-based QA was run in a restricted environment without available WebGL, exercising the fallback renderer instead. Android touch handling should be tested on a physical device before release status is advanced.

The game is offline-capable after proper HTTPS PWA installation; opening just `PLAY.html` doesn't install the PWA or necessarily guarantee reliable browser storage. Export backups for any valuable worlds.

## Controls

Swipe in direction you want globe to move; pinch to zoom; tap land to inspect; double tap to zoom toward it; drag while time advances; focus button to return to your realm. Target another province, then open God Powers to act on it. An adjacent province is needed to Claim Territory.

## Developer structure

- `index.html` lightweight game UI
- `game.js` procedural world, simulation, shaders, camera, powers, saving
- `style.css` responsive light-overlay interface
- `manifest.webmanifest`, `service-worker.js`, `icon.svg` PWA assets
- `PLAY.html` single-file version

## QA

Tests in headless Chromium fallback: character creation; 50-year and 1000-year simulation; god-power list and intervention; realm and chronicle panels; three save slots, new world in slot 2, restore slot 1; syntax checks; no page errors in these tests. Rendering differences and touch gestures on a real Android device remain unverified.