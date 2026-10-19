# The SpotPlot family

SpotPlot is several projects that have to stay in step. This folder (in the desktop app's repo) is home base for everything they share. Each other project points back here.

| Project | What it is | Where | Repo |
|---|---|---|---|
| **Desktop app** | The Mac app (Electron + React). Source of truth for every show. | `~/Developer/SpotPlot/followspot` | `wheeler-moon/Followspot` (public) |
| **iPad app** | Operator tablet app (native Swift / SwiftUI). Phase 1 built (find the Mac, pair, cue list, paperwork, updates, show files); plan in `ipad-app-plan.md`, build notes in its own `CLAUDE.md`. | `~/Developer/SpotPlot/spotplot-ipad` | `wheeler-moon/spotplot-ipad` (private) |
| **Website** | spotplotapp.com: home, pricing, manual, support. Plain HTML/CSS on GitHub Pages. | `~/Developer/SpotPlot/spotplot-website` | `wheeler-moon/spotplot-website` (public) |
| **License server** | Activates and checks license keys; admin page. Pushing `main` deploys to Render. | `~/Developer/SpotPlot/spotplot-server` | `wheeler-moon/spotplot-server` (private) |
| **Promo video** | 30-second launch video (Remotion), on an invented demo show. Parked. | `~/Dropbox (Personal)/1. Professional Projects/1. Active/SpotPlot/spotplot-video` | none yet |

## Shared documents (all in the desktop repo)

| Document | Covers |
|---|---|
| `../TODO.md` | The one to-do list for every project, by product. Open items only. |
| `../CHANGELOG.md` | Every user-visible change, as it happens. Becomes the release notes. |
| `../DESIGN.md` | The one design language: desktop app, iPad app, website and printed sheets. |
| `sync-protocol.md` | The contract between the desktop app and the iPad app. Versioned. |
| `ipad-app-plan.md` | The iPad app's design and build phases. |
| `admin-dashboard-plan.md` | License server: expiry dates, Stripe, the admin dashboard, security fixes. |
| `../CLAUDE.md` | How the desktop app is built, plus the "done means done" checklist. |

## How the projects connect

- **Desktop ↔ iPad:** over the local network, defined in `sync-protocol.md`. Show data is the same as a `.spotplot` export (`src/showFile.js`). Any change to show data or to that API must update the protocol doc, and the iPad app if needed.
- **Desktop ↔ license server:** `src/license.js` calls `spotplot-server.onrender.com` (activate, validate, device limit).
- **Desktop ↔ website:** the website's download button links to the newest GitHub release's `SpotPlot.dmg`. The manual and support pages describe the app, so they must change when the app does. The app's Help menu and Settings link to spotplotapp.com.
- **Website ↔ license server:** pricing and Buy buttons will link to Stripe checkout, which issues license keys (not set up yet).
