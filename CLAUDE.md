# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**SpotPlot**: a macOS desktop app (Electron + React) for theatrical followspot paperwork. A lighting designer builds a show's spots, color frames (gels), scenes, characters and a cue list, then prints spot sheets, caller sheets, color load sheets and spot notes as PDFs. It's sold with license keys. The repo/folder is named "followspot"; the product name everywhere user-facing is "SpotPlot".

The owner is a lighting designer, not a professional developer, and built the app through conversations with Claude. Explain changes in plain terms and keep them focused.

## SpotPlot family

The desktop app is one of several projects: the iPad app, the website (spotplotapp.com), the license server and the promo video. `docs/README.md` maps them and how they connect. This repo is home base for the shared docs: `TODO.md` (the one to-do list, by product), `CHANGELOG.md`, `DESIGN.md` (one design language for all of them) and `docs/sync-protocol.md` (the desktop ↔ iPad contract).

## Done means done (every change)

Before calling any change finished, go through this list and do what applies:

1. **TODO.md:** remove the finished item; add any follow-ups to the right product's section.
2. **CHANGELOG.md:** add a plain-words line under Unreleased if a user would notice the change.
3. **Show data:** if show data changed (columns, JSON on `shows`, tables, images), run the export/import round-trip test (below) and update `docs/sync-protocol.md` (and the iPad app) so the iPad still understands it.
4. **iPad Sync API:** if `src/ipadSync.js` changed what it sends or accepts, update `docs/sync-protocol.md`, and bump its version if older iPads would notice.
5. **Website:** if the change affects how the app works or looks, update the manual or support page in `~/Desktop/spotplot-website` (and its screenshots if they're now wrong). Same for pricing or plan changes.
6. **Tips:** if a screen's controls changed, check `src/tips.js` still points at real controls with accurate words.
7. **Design:** new UI follows `DESIGN.md`; a new pattern or color gets added to it.
8. **Release:** at release time, Unreleased in `CHANGELOG.md` becomes the release notes.

## Commands

```bash
npm start          # dev run (electron-forge start, DevTools open automatically)
npm run make       # signed + notarized DMG and release zip (macOS, needs signing setup below).
                   # scripts/make.js retries up to 3 times when Apple's timestamp server drops a signing request
```

There are no tests and no linter (`npm run lint` is a no-op). To verify a change, run the app.

## Architecture

- **`src/main.js`**: Electron main process. Owns everything with side effects: the SQLite database, all IPC handlers, file dialogs, PDF generation, menu bar, auto-updater and Chromium setup.
- **`src/App.jsx`**: renderer root. Gates on license status, then does screen routing through a `screen` string in state plus `navigate(dest, show)`. There is no router library. Screens live in `src/screens/`, and show-settings sub-panels are in `src/screens/settings/`.
- **`src/pdfGenerator.js`**: builds each PDF as an HTML string (`build*HTML`) and renders it with Puppeteer (`generate*PDF`). PDF layout changes happen in these HTML/CSS template strings.
- **`src/ipadSync.js`**: the local-network link to SpotPlot for iPad (plan: `docs/ipad-app-plan.md`). When "Let iPads connect" is on (Show Settings → iPad Sync), it runs a small HTTP server on port 47800 (any free port if that's taken) and announces `_spotplot._tcp` with macOS's `dns-sd`. iPads pair with the 6-digit code, then use a bearer token for `/api/shows`, `/api/shows/:id` (the `.spotplot` export plus `sync_version`), `/api/shows/:id/pdf?kind=spot|caller` and `/api/presence` (every few seconds; online = seen in the last 15s). Settings and paired iPads live in `userData/ipad-sync.json`, per Mac, not in any show.
- **`src/license.js`**: activation/validation against `https://spotplot-server.onrender.com` (a separate server, not in this repo). The result is cached in `localStorage` under `spotplot_license` and trusted for 7 days, and it falls back to the cache when offline. Every check also sends an anonymous per-Mac `device_id` (random UUID in `userData/device.json`, via `get-device-info`) and the app version; the server allows each license on **2 Macs** and answers `code: 'device_limit'` for a third, which `App.jsx` shows as the "License in use on 2 Macs" screen. While open, the app re-validates every 15 minutes so the admin page can show "active now". The server lives in `~/Desktop/spotplot-server` (GitHub `wheeler-moon/spotplot-server`, private); pushing its `main` deploys to Render.

### IPC pattern (important)

`nodeIntegration: true`, `contextIsolation: false`, so renderer code calls `window.require('electron').ipcRenderer` directly and `preload.js` is empty. Almost every call is **synchronous**: the renderer calls `ipcRenderer.sendSync('db-…', args)` and the handler in `main.js` sets `event.returnValue`. Even the async handlers (PDF export, show export/import) end by setting `event.returnValue`. To add a feature, add an `ipcMain.on('db-…')` handler inside `setupIPC()` and call it with `sendSync` from the screen.

Main → renderer messages come from the menu bar: `menu-new-show`, `menu-export-show`, `menu-import-show`, `menu-add-cue` (Cmd+=). Screens subscribe with `ipcRenderer.on` and must remove the listener on unmount. `setupIPC()` must only run once, because running it twice caused double cue inserts.

### Data model

The SQLite file lives at `app.getPath('userData')/followspot.db`, with the schema in `initSchema()` in `main.js`. Core relations:

- `shows` → `spots` → `color_slots` (gel frames per spot; `is_permanent` marks permanent frames)
- `shows` → `scenes`, `characters`, `cues` (ordered by `sort_order`)
- `spot_cues`: one row per (cue, spot), holding what that spot does in that cue (action, character, frame size, intensity, fade, highlight, notes, …). Adding a spot to a show with existing cues creates "Off" `spot_cues` rows for every cue, and new cues get rows for every spot.
- `gels`: gel catalog, seeded by `seedGels()`.
- `shows.iris_sizes` and `shows.custom_actions` are **JSON strings**. Parse them before use.

**Migrations**: new columns are added as `try { db.exec('ALTER TABLE … ADD COLUMN …') } catch(e) {}` lines at the end of `initSchema()`, which fail silently if the column already exists. Follow this pattern and never edit the `CREATE TABLE` statements alone, because existing users' databases won't pick those up. `db-update-show` only writes columns in its `allowed` whitelist, so add new show fields there too.

**Show files** (`.spotplot`): handled in `src/showFile.js`. Export writes every row of the show (`SELECT *`) plus every image it uses (logo, character photos, custom action icons) as base64. Import inserts every column the local table has, so new plain columns need no changes; it remaps ids and links, and restores images into `userData/images`. If you add a **table**, a **foreign-key column** or a new **image path**, update `showFile.js`. Images the user adds are always copied into `userData/images` (`storeImageCopy` in `main.js`).

**Rule: every feature must survive export → import.** Anything a user can set on a show (new columns, settings, images, JSON stored on `shows`) must come back identical after exporting a `.spotplot` file and importing it. After any change that adds or changes show data, run the round-trip test, which works on a copy of the local database and never the real one:

```bash
ELECTRON_RUN_AS_NODE=1 ./node_modules/.bin/electron scripts/test-show-roundtrip.js
```

It must print `PASSED`. If you add a new table, a link between rows, or a new kind of image path, update both `src/showFile.js` and the comparisons in `scripts/test-show-roundtrip.js`.

## Build, signing and release

- `forge.config.js` signs with the owner's Developer ID and notarizes with the keychain profile `AC_PASSWORD`. The `postPackage` hook re-signs, notarizes, staples and writes `make/zip/darwin/arm64/SpotPlot-darwin.zip`. The `postMake` hook rebuilds the DMG with `dmgbuild` (Python) and `dmgbuild_settings.py` to embed the EULA (`LICENSE.rtf`/`LICENSE.txt`).
- PDFs need Chromium. One Chrome for Testing build is pinned in `src/chromeVersion.js` (`CHROME_BUILD`). The packaged app bundles it from `~/.cache/puppeteer/chrome/mac_arm-<CHROME_BUILD>/` (`forge.config.js` `extraResource`), and `npm start` uses the same build, downloading it once if missing. To change versions, edit `CHROME_BUILD` and run `npx @puppeteer/browsers install chrome@<version>` before building. The path is passed through `global.chromiumPath`.
- Auto-update uses `update.electronjs.org` against the GitHub repo `wheeler-moon/Followspot` (public). It only runs when `app.isPackaged`.
- Build output (`out/`, `make/`, `.webpack/`, `*.zip`, `*.dmg`) is gitignored.

**Release steps:**
1. Bump the version in `package.json` **and** the hard-coded display string in `src/screens/HomeScreen.jsx` (currently `'Beta 0.3.1'`).
2. `npm run make`
   Release notes: turn `CHANGELOG.md`'s Unreleased section into the new version's section (with the date) and use it for the GitHub release text. Check the website manual matches.
3. Create a GitHub Release tagged `vX.X.X` and upload the DMG plus `make/zip/darwin/arm64/SpotPlot-darwin.zip`. That's the one the postPackage hook writes, at the **project root** `make/`. `out/make/zip/darwin/arm64/SpotPlot-darwin.zip` is a stale leftover from an older hook, so don't upload it.

## Secrets

The GitHub repo is public. Never put the license-server admin password, license keys, or signing credentials in any committed file (including this one). The license server (`spotplot-server.onrender.com`, admin UI at `/admin`) is a separate project.

## Design

Follow `DESIGN.md` for any new or reworked UI: colors, type sizes, control sizes, radii and spacing. It's based on Apple's macOS 27 UI Kit and adapted for SpotPlot. Existing screens don't match it yet; that's the design-refresh item in `TODO.md`.

## Roadmap

The to-do list for every SpotPlot project lives in `TODO.md`, by product, open items only. Check it when starting new work. Finished items are removed and recorded in `CHANGELOG.md` (see Done means done).
