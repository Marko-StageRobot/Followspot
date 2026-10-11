# SpotPlot To-Do

Current version: Beta 0.3.0

## Next (0.4.0): while beta feedback comes in
- [ ] Promo video (see Marketing)
- [ ] SpotPlot website (see Marketing)
- [ ] Faster cue list loading: big shows take a couple of seconds to open
- [ ] Undo for Renumber T·
- [ ] First-run tips for Show Settings (spots, gels, iris sizes, Cue Settings)
- [ ] Help → Send Feedback: opens an email to support with the app version filled in
- [ ] Beta feedback: add items here as testers report them

## 0.3.0: release to the larger beta group

**In so far (since 0.2.1):**
- Design refresh: Apple dark palette, Apple Blue accent (no purple), filled buttons, macOS toolbar, grouped lists (Scenes, Characters, Show Settings sidebar, Spot Notes)
- New show dashboard (System Settings-style lists instead of stat cards and tiles)
- Cue list: pinned, centered scene headers (green; act breaks orange, [bracketed] while scrolling a scene), more space between spots
- Scenes page handles 3+ act breaks
- Installer: proper license window (formatted agreement, standard Agree/Disagree buttons and message)
- Build: notarizes once with automatic retries

**Also in 0.3.0 (to build):**
- [x] Permanent color: in Spot Settings and New Show, a "Permanent" checkbox per spot; when checked, a gel picker (from the gel list) appears for the gel that always stays in the fixture. Copyable between spots (Copy colors from…) and shown on the printed Color Load sheet
- [x] Printing: a cue never splits across pages; if it doesn't fit, the whole cue moves to the next page
- [x] Printing: when a spot's color frames change from its previous cue, the color frame box is highlighted yellow on the printed sheets
- [x] Update the spot fixture options list
- [x] New built-in action "Dump & Restore", listed right after "Up & Out"
- [x] Show Settings: new "Cue Settings" tab listing every cue field (action, character, intensity, iris, frames, time, When, Notes…) with two checkboxes each, "Show on cue list" and "Show on print" (all checked by default). Unchecking hides the field; no data is deleted
- [x] Show dashboard: "iPad Sync" button (will later change color when syncing) that opens Show Settings straight to a new "iPad Sync" tab; for now the tab says "iPad app coming soon"
- [x] Caller sheet layout: plain iris/color/time in a labeled strip, When/Notes in a labeled box, tighter spacing
- [x] Prints: "Page X of Y" at the bottom of every sheet; each spot's first color is highlighted like a color change; no purple left on Spot Notes
- [x] First-run tips: the first time each screen shows a control, a popover points at it and explains it (Next / Skip tips). Text lives in `src/tips.js`; Help → Show Tips Again brings them back
- [x] Cue list: "Renumber T·" button renumbers spot cue (T·) numbers 1, 2, 3… top to bottom without changing cue order, scenes or LQs
- [x] Prints: T· numbers in small gray under each LQ on spot and caller sheets, with a "T· numbers" switch on the Print page (on by default)


**Before release:**
- [x] Bump version to 0.3.0 in `package.json` and `src/screens/HomeScreen.jsx` ("Beta 0.3.0")
- [x] `npm run make` succeeds (signed + notarized)
- [ ] Installer license window shows formatted text and Agree / Disagree / Print / Save with the standard message
- [ ] Click through every screen in the installed app: home, dashboard, cue list (scroll scenes, pinned headers), scenes, characters, spot notes, print (preview + export), show settings
- [ ] First-run tips show on a fresh install, and existing 0.2.1 users see them once after updating
- [ ] Existing 0.2.1 install auto-updates to 0.3.0 (Check for Updates)
- [ ] Release notes written
- [ ] GitHub release `v0.3.0` (not pre-release) with the DMG and `make/zip/darwin/arm64/SpotPlot-darwin.zip`

## 0.2.1 release checklist (done)
- [x] Before building: fix show import dropping per-cell data (see Bugs)
- [x] Before building: include character photos in `.spotplot` exports and restore them on import (see Bugs)
- [x] After installing the new build: `.spotplot` files show the SpotPlot icon in Finder. **To test (needs a log out):** rebuild with `npm run make` (the JSON→data file-type fix), install, run `lsregister -f /Applications/SpotPlot.app` and `qlmanage -r cache && killall Finder`, then log out and back in (Apple menu → Log Out) if a file still shows a text preview.
- [x] After installing the new build: double-clicking a `.spotplot` file opens SpotPlot and imports the show
- [x] After installing the new build: File → Import Show (Cmd+I) still works
- [x] After installing the new build: SpotPlot opens past the license screen, and the license admin page shows this Mac under Devices (1/2)
- [x] After installing the new build: Print page shows the real PDF preview with page breaks (not blank), options update it, and Export PDF… saves

## Bugs
- [x] `.spotplot` file icon not showing the SpotPlot logo in Finder — *fix in forge.config.js (Info.plist document type); verify after the next build*
- [x] **Fix before next release.** Show import drops per-cell data: highlights, spot notes, no-color, ignore, note-checked and custom character names are lost when importing a `.spotplot` file (import INSERT in `db-import-show` only copies some `spot_cues` columns)
- [x] Characters screen: dropping an image onto the photo box opens a file picker instead of using the dropped file
- [x] `.spotplot` exports only carry the show logo, not character photos (or custom action icons), so a shared show arrives without cast photos. Embed them in the export like the logo and save them into `userData/images` on import.
- [x] Dev only: `npm start` downloads a fresh Chrome for Testing ("Downloading Chromium...") whenever Chrome updates, because `main.js` asks for the latest stable instead of the version Puppeteer expects. ~4 GB of duplicate copies have piled up in `~/.cache/puppeteer`. Pin dev to one version (the one `forge.config.js` bundles), then delete the extra copies. Doesn't affect installed builds.

## App features
- [ ] Finder preview of `.spotplot` files shows that show's logo (the small file icon stays the SpotPlot logo). Needs a Quick Look **Preview** extension (not a Thumbnail extension, which would replace the icon): a small Swift `.appex` that reads the file's JSON, decodes the embedded logo from `images[show.logo_path]`, and shows it, falling back to the SpotPlot icon. Requires installing Xcode, building the appex as part of `npm run make`, and embedding it in `SpotPlot.app/Contents/PlugIns` before signing/notarizing (app extensions must be sandboxed). Test from a signed, installed build.
- [x] Bold/italic/underline in when/notes fields (Cmd+B, Cmd+I, Cmd+U)
- [x] Onboarding walkthrough for new users (tooltip-style popups on first launch)
- [x] Update default fixture types list in Spot Settings
- [x] Cue list: make "w/ LQ" a toggle that stays linked to the cue's LQ number, so renumbering the cue updates it automatically (no re-pressing the button)
- [x] Cue list: don't show the hover "insert cue" button on the last cue, since the permanent add button at the bottom covers it
- [x] Cue list: iris sizes and gel frames get crowded with custom iris sizes and as spots are added; make that area less cramped
- [x] Show Settings: swap all cue data between two spots for the entire cue list with one button (e.g. Spot 1 ⇄ Spot 2)
- [x] Cue popup (double-click): more flexible highlighting, e.g. highlight just the notes instead of the whole cue cell
- [x] Cue list cells: put action and character on the same row (same behavior as now), and make both much bigger and easier to read
- [x] Spot Settings: option to copy Spot 1's colors (gel frames) to the other spots, so identical color loads don't have to be typed for each spot

## Print / paperwork
- [x] Print page redesign with live preview (replaces "PDF preview before export"): instead of one long list of print options, start with "Select what you want to print" (e.g. Spot 1, Caller sheet, Color load, Spot notes). The selected sheet shows as a live preview of the actual PDF, with its options beside it (hide Off, hide Tracked, cue range, label…); changing an option re-renders the preview immediately. Export saves exactly what the preview shows.
- [x] Caller sheet design v2: easier to read, more compact
- [x] Spot sheet page breaks: cues shouldn't split across pages
- [ ] Action symbols cheat sheet PDF

## Structural
- [ ] Shrink the app (~290 MB → ~100 MB) by rendering PDFs with Electron's built-in Chromium (`webContents.printToPDF` in a hidden window) instead of bundling Chrome for Testing. Smaller downloads/updates, ~3× faster notarization uploads, far fewer files to sign (fewer timestamp failures). **Caution:** an earlier attempt had PDF problems, which is why Chrome was bundled; compare every sheet type pixel-for-pixel against the current output before switching, and keep the bundled Chrome as a fallback until verified.
- [ ] Settings popup: more robust system-wide toggles

## Business
- [ ] Stripe integration: monthly/yearly, standard/student ($15/$170 and $10/$115)
- [x] Device limits per license key (max 2 devices)
- [ ] Windows distribution

## Design
- [x] Pre-launch design refresh: make it feel premium and original

## Marketing
- [ ] 30-second Apple-style promo video, "show from start to PDF finish": built in code with Remotion in a separate project folder next to followspot. Script the real app (remote-debugging port) to perform each step on an invented demo show (e.g. "The Lighthouse — A New Musical": cast with photos, 3 spots with gels, scenes, a full cue list), capture it in high resolution, then animate: desktop/Dock open → camera pushes into the window → build the show → zoom into a cue cell → character sheet → live print preview → PDF slides out → end card (logo, tagline, website). Short captions over scenes. Needs from Wheeler: tagline, website, royalty-free music track, format (16:9 and/or 9:16).

- [ ] SpotPlot website: what it is, screenshots and the promo video, pricing, download, support/contact. Separate project folder next to followspot

## Future / roadmap
- [ ] SpotPlot Live Sync: cloud upload from desktop + iPad companion app for operators
