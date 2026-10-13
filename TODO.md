# SpotPlot To-Do

The one to-do list for every SpotPlot project (see `docs/README.md` for the family map).

**How this list works**
- Open items only, grouped by product. When something is done, delete it here and add a line to `CHANGELOG.md` (Unreleased) if users will notice it.
- New requests and beta bug reports go into the right product's section straight away, even if they're for "someday".
- Anything that touches more than one product (e.g. new show data the iPad must understand) says so, so neither side is forgotten.

**Launch target: January 1, 2027** (Standard and Student plans on sale). Everything here is sorted with that date in mind.

Current desktop version: **0.3.0** (released 2026-10-10). Changes since then: `CHANGELOG.md` → Unreleased.

## Desktop app (`followspot`)

### Next (0.4.0)
- [ ] Faster cue list loading: big shows take a couple of seconds to open
- [ ] Undo for Renumber T·
- [ ] First-run tips for Show Settings (spots, gels, iris sizes, Cue Settings)
- [ ] Help → Send Feedback: opens an email to support with the app version filled in
- [ ] Beta feedback: add items here as testers report them

- [ ] Print header redesign (Wheeler has opinions): caller sheet header, spot sheet header, and the Color Load page. Waiting on his notes

### Later
- [ ] Action symbols cheat sheet PDF
- [ ] Settings popup: more robust app-wide toggles
- [ ] Finder preview of `.spotplot` files shows that show's logo (the small file icon stays the SpotPlot logo). Needs a Quick Look **Preview** extension (not a Thumbnail extension, which would replace the icon): a small Swift `.appex` that reads the file's JSON, decodes the embedded logo from `images[show.logo_path]`, and shows it, falling back to the SpotPlot icon. Requires Xcode, building the appex as part of `npm run make`, and embedding it in `SpotPlot.app/Contents/PlugIns` before signing/notarizing (app extensions must be sandboxed). Test from a signed, installed build.
- [ ] Shrink the app (~290 MB → ~100 MB) by rendering PDFs with Electron's built-in Chromium (`webContents.printToPDF` in a hidden window) instead of bundling Chrome for Testing. Smaller downloads and updates, faster notarization, fewer files to sign. **Caution:** an earlier attempt had PDF problems, which is why Chrome was bundled; compare every sheet type against the current output before switching, and keep the bundled Chrome as a fallback until verified.
- [ ] Import a SpotOn file (a CSV export) and automatically build a SpotPlot show from it: spots, cues and each spot's cue data. Needs a sample SpotOn CSV to map its columns
- [ ] Windows version

### Housekeeping
- [ ] Commit the dev-only `SPOTPLOT_USER_DATA` switch in `src/main.js` (runs the app on a separate data folder, e.g. the demo show for iPad testing). Uncommitted so far

## iPad app (`spotplot-ipad`, not created yet)

Plan: `docs/ipad-app-plan.md`. Contract with the desktop: `docs/sync-protocol.md`.

- [ ] Install Xcode (App Store) and run `sudo xcode-select -s /Applications/Xcode.app`
- [ ] Phase 1, iPad side: find the Mac, pair, pick a show and role, cue list view and PDF view, keep shows for standalone use (desktop side done)
- [ ] Phase 2: suggestions (When/Notes editing), offline queue, desktop review list, approval switch
- [ ] Phase 3: live sync while connected
- [ ] Phase 4: follow the Eos console (Now / Next bar, live highlight), then grandMA
- [ ] Phase 5: polish, TestFlight beta, App Store
- [ ] Desktop: if SpotPlot crashes with iPad Sync on, the Bonjour announcement can linger until restart; make it stop with the app

## Website (`spotplot-website`, spotplotapp.com)
- [ ] Tick "Enforce HTTPS" in GitHub → Settings → Pages once the certificate is ready
- [ ] Buy buttons: switch the "Coming soon" buttons to Stripe checkout links at launch (see the site's README)
- [ ] Check the Support page's billing answers match how Stripe is set up
- [ ] Add the promo video when it's finished
- [ ] **Wording pass (Wheeler):** comb through every page (home, manual, support) and fix the wording. Send edits in any form (marked-up screenshots, pasted text, "change X to Y") and they get applied across all pages
- [ ] Polish pass (more later)

## License server (`spotplot-server`)

Plan: `docs/admin-dashboard-plan.md`.

- [ ] **Security, before paying customers:** remove the built-in admin password fallback; generate license keys with secure randomness; move storage from one JSON file to SQLite
- [ ] Expiry dates on licenses (renews/expires on), returned to the app by `/validate`, with a 24-hour grace period after a failed payment
- [ ] Stripe: create and renew licenses automatically from webhooks (Standard and Student, monthly and yearly)
- [ ] Student plan: .edu email verification
- [ ] Admin dashboard: home (expiring soon, payments failing, by plan, revenue), search and filters, license page (extend/set expiry, change plan or device limit, revoke/reinstate, resend email, notes), history of every change, CSV export
- [ ] Desktop app: show "Renews on…" and expiry notices from the license check (desktop section too)
- [ ] Stripe emails: turn on receipts, failed-payment and expiring-card emails, yearly renewal reminders, and the customer portal (cancel / update card)
- [ ] Before launch: research current auto-renewal, sales-tax and international rules; checklist for a lawyer/accountant to sign off; add Terms of Service and Privacy pages to the website
- [ ] Q1 2027: Production licenses (show, spots, close date). Q2 2027: Education licenses (school, seats)

## Business and pricing
- [ ] Stripe integration. Plans: Standard $15/month or $144/year; Student $8/month or $72/year (.edu). Launch with Standard and Student in January; Production tier Q1 after launch; Education tier Q2
- [ ] Production plan: revisit the device count (spots × 2 + 2), since iPads are free and don't need licenses
- [ ] Windows distribution

## Marketing
- [ ] Promo video (`~/Desktop/spotplot-video`): **parked until about mid-November**, while the product gets finished. A rough first cut exists (silent, 16:9); expect to rework it once the app and iPad app are closer to launch (see its README)

## Future
- [ ] SpotPlot Live Sync over the cloud (beyond the local-network iPad app)
- [ ] EOS Control tab in Show Settings (console features on the desktop)
