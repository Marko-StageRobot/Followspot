# SpotPlot To-Do

The one to-do list for every SpotPlot project (see `docs/README.md` for the family map).

**How this list works**
- Open items only, grouped by product. When something is done, delete it here and add a line to `CHANGELOG.md` (Unreleased) if users will notice it.
- New requests and beta bug reports go into the right product's section straight away, even if they're for "someday".
- Anything that touches more than one product (e.g. new show data the iPad must understand) says so, so neither side is forgotten.

**Launch target: January 1, 2027** (Standard and Student plans on sale). Everything here is sorted with that date in mind.

Current desktop version: **0.3.1** (released 2026-10-14). Changes since then: `CHANGELOG.md` → Unreleased.

## Desktop app (`followspot`)

### Next (0.4.0)
- [ ] Faster cue list loading: big shows take a couple of seconds to open
- [ ] Update notices: Settings → Updates now shows checking / downloading / ready and re-checks every 4 hours. Still to do: a small "Downloading SpotPlot X.X.X…" notice outside Settings, and SpotPlot → Check for Updates… saying "You're up to date" instead of nothing visible. Only helps once people have 0.4.0
- [ ] Settings → About: add Terms of Service and Privacy Policy links once those pages are on the website
- [ ] Example text pass: go through every field's grey example text (show title, operator, location, characters, search boxes… about 25 in the app, plus the iPad app's) and make sure Wheeler likes each one: real theatre-sounding examples, same style everywhere
- [ ] First-run tips for Show Settings (spots, gels, iris sizes, Cue Settings)
- [ ] Beta feedback: add items here as testers report them
- [ ] Right-click menus beyond the cue boxes (same real macOS menu, `show-context-menu` in main.js): scene headers (rename, add cue), the LQ column (insert, delete, page number)
- [ ] ⌘C / ⌘V for a cue box without right-clicking (needs a way to select a box first)

- [ ] Print header redesign (Wheeler has opinions): caller sheet header, spot sheet header, and the Color Load page. Waiting on his notes

### Later
- [ ] Gel catalog upkeep: refresh `src/gels.json` from the makers' sites now and then (and bump `GEL_CATALOG_VERSION` in `main.js`). Discontinued gels people still use can be added back on request
- [ ] Settings popup: more robust app-wide toggles
- [ ] Finder preview of `.spotplot` files shows that show's logo (the small file icon stays the SpotPlot logo). Needs a Quick Look **Preview** extension (not a Thumbnail extension, which would replace the icon): a small Swift `.appex` that reads the file's JSON, decodes the embedded logo from `images[show.logo_path]`, and shows it, falling back to the SpotPlot icon. Requires Xcode, building the appex as part of `npm run make`, and embedding it in `SpotPlot.app/Contents/PlugIns` before signing/notarizing (app extensions must be sandboxed). Test from a signed, installed build.
- [ ] Shrink the app (~290 MB → ~100 MB) by rendering PDFs with Electron's built-in Chromium (`webContents.printToPDF` in a hidden window) instead of bundling Chrome for Testing. Smaller downloads and updates, faster notarization, fewer files to sign. **Caution:** an earlier attempt had PDF problems, which is why Chrome was bundled; compare every sheet type against the current output before switching, and keep the bundled Chrome as a fallback until verified.
- [ ] Import a SpotOn file (a CSV export) and automatically build a SpotPlot show from it: spots, cues and each spot's cue data. Needs a sample SpotOn CSV to map its columns
- [ ] Windows version
- [ ] **Make the app's code private** (do it alongside a release). Two repos: `Followspot` goes private (source code); a new public `spotplot-releases` holds only the DMG and zip for each release, with no code. Steps:
  1. Create `spotplot-releases` (public).
  2. Point auto-update at it (`update.electronjs.org/wheeler-moon/spotplot-releases/...` in `main.js`) and the website's Download button at its `releases/latest/download/SpotPlot.dmg`.
  3. Publish that version's release in **both** repos, so installed copies (which still check `Followspot`) update to the version that checks the new repo.
  4. Once most users are on it, make `Followspot` private and update the release steps in `CLAUDE.md`.

  Beta testers on very old versions may need one manual download. Making it private doesn't erase what was public before; no secrets were ever in it

## iPad app (`spotplot-ipad`)

Plan: `docs/ipad-app-plan.md`. Contract with the desktop: `docs/sync-protocol.md`.

- [ ] Phase 1 finish: check landscape (When and Notes get separate columns) and text size in a dark booth on the real iPad
- [ ] Keep the iPad's copies in step: `Resources/gels.json` (from `src/gels.json`) and `Resources/action-icons.json` (from the ActionIcon SVGs in `src/screens/CueListScreen.jsx`) whenever those change
- [ ] Phase 2: suggestions (When/Notes editing), offline queue, desktop review list, approval switch
- [ ] Phase 2: send cue flags (Missed / Clarify / Idea) to the Mac so the LD sees them in the cue list; today they stay on the iPad and can be shared as text
- [ ] Phase 3: live sync while connected
- [ ] Phase 4: follow the Eos console (Now / Next bar, live highlight), then grandMA
- [ ] Phase 5: polish, TestFlight beta, App Store

## Website (`spotplot-website`, spotplotapp.com)
- [ ] Buy buttons: switch the "Coming soon" buttons to Stripe checkout links at launch (see the site's README)
- [ ] Check the Support page's billing answers match how Stripe is set up
- [ ] Add the promo video when it's finished
- [ ] **Wording pass (Wheeler):** comb through every page (home, manual, support) and fix the wording. Send edits in any form (marked-up screenshots, pasted text, "change X to Y") and they get applied across all pages
- [ ] Polish pass (more later)

## License server (`spotplot-server`)

Plan: `docs/admin-dashboard-plan.md`.

- [ ] Move license storage from one JSON file to SQLite (before Stripe)
- [ ] Expiry dates on licenses (renews/expires on), returned to the app by `/validate`, with a 24-hour grace period after a failed payment
- [ ] Stripe: create and renew licenses automatically from webhooks (Standard and Student, monthly and yearly)
- [ ] Student plan: .edu email verification
- [ ] Admin dashboard: home (expiring soon, payments failing, by plan, revenue), search and filters, license page (extend/set expiry, change plan or device limit, revoke/reinstate, resend email, notes), history of every change, CSV export
- [ ] Stripe → licenses: webhooks fill each license's `billing_interval`, `renews_at`, `ends_at` and `payment_failed` (the server already sends them to Settings → Account), and set `STRIPE_PORTAL_URL` on Render so Settings → Manage… opens the customer portal
- [ ] Stripe emails: turn on receipts, failed-payment and expiring-card emails, yearly renewal reminders, and the customer portal (cancel / update card)
- [ ] Before launch: research current auto-renewal, sales-tax and international rules; checklist for a lawyer/accountant to sign off; add Terms of Service and Privacy pages to the website
- [ ] Q1 2027: Production licenses (show, spots, close date). Q2 2027: Education licenses (school, seats)

## Business and pricing
- [ ] Stripe integration. Plans: Standard $15/month or $144/year; Student $8/month or $72/year (.edu). Launch with Standard and Student in January; Production tier Q1 after launch; Education tier Q2
- [ ] Production plan: revisit the device count (spots × 2 + 2), since iPads are free and don't need licenses
- [ ] Windows distribution
- [ ] **Student license term:** a Student license lasts 4 years or until the student's graduation date, whichever comes sooner (the website's Support page already says so). Needs: an end date on student licenses in the license server, collecting the graduation date at signup (with .edu verification), and a reminder email before it ends with an offer to move to Standard
- [ ] Keep the 2-Mac limit unadvertised: the website and marketing never mention how many Macs a license covers (Wheeler, 2026-10-16). The app still enforces it; the "License in use on 2 Macs" screen is the only place it shows

## Marketing
- [ ] Promo video (`~/Dropbox (Personal)/1. Professional Projects/1. Active/SpotPlot/spotplot-video`): **parked until about mid-November**, while the product gets finished. A rough first cut exists (silent, 16:9); expect to rework it once the app and iPad app are closer to launch (see its README)

## Future
- [ ] SpotPlot Live Sync over the cloud (beyond the local-network iPad app)
- [ ] EOS Control tab in Show Settings (console features on the desktop)
