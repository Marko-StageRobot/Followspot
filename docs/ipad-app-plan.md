# SpotPlot for iPad: plan

Working plan for the operator tablet app. Started 2026-10-12. Decisions marked **Decided** came from Wheeler; everything else is a proposal to refine.

## Goals

- Every spot operator (and the caller) has their spot's cues on an iPad: the printed sheets, and a new easy-to-read cue list.
- iPads sync live with SpotPlot on the Mac during tech, and keep working on their own after the Mac leaves.
- Optionally follow the lighting console, so the current cue is always highlighted.
- Operators can only add to **When** and **Notes**, and those edits need approval.

## Decisions so far

- **Decided: network.** Usually a private Wi-Fi network (often the lighting network's access point); sometimes wired with a USB-C Ethernet adapter for long-running shows. No internet required.
- **Decided: roles.** Spot 1, 2, 3… or Caller. The caller is usually a spot op, but could be a stage manager on an iPad.
- **Decided: no limit on iPads.** Several iPads can view the same spot (e.g. five on Spot 1).
- **Decided: edits need approval.** Operator edits to When and Notes are suggestions until accepted on the desktop.
- **Decided: iPad first.** Android later.
- **Decided: approval can be switched on or off** (e.g. on during tech, off once tech is done).
- **Decided: standalone notes stay on that iPad** until a Mac connects again.
- **Decided: the caller picks which spots to show.**
- **Decided: Eos first,** grandMA later.
- **Decided: the iPad app is free and unrestricted.** It can only get shows from a licensed SpotPlot (by sync or a `.spotplot` file it exported), so the license lives on the Mac (see Licensing).

## How it fits together

```
          SpotPlot on the Mac (home base during tech)
          - holds the show (source of truth)
          - announces itself on the network, pairs iPads
          - sends shows + updates, reviews suggestions
                 │            ▲
     show + updates            │ suggestions (When / Notes)
                 ▼            │
   iPad (Spot 1)   iPad (Spot 1)   iPad (Spot 2)   iPad (Caller)
   - keeps its own full copy of the show; works with the Mac gone
   - optional: listens to the Eos console directly (read-only)
                 ▲
                 │ cue events (OSC), listen only
          Eos lighting console
```

## Connecting

1. The desktop advertises itself on the local network (Bonjour, the same discovery AirPrint uses).
2. The iPad shows "SpotPlot on Maya's MacBook" and the user taps it. Fallbacks for networks that block discovery: scan a QR code shown on the desktop, or type its address.
3. **Pairing (per show, decided 2026-10-17):** each show has its own "Let iPads connect" switch and 6-digit code in its Show Settings → iPad Sync. The iPad taps **Add Show**, picks the Mac and enters that show's code; it gets that show and nothing else on the Mac. The code stays the same until New Code. A show switched off is hidden from iPads, even ones paired before. Paired iPads reconnect automatically.
4. The iPad picks a **role** (Spot 1, 2… or Caller).

## On the iPad

- **Cue list view (new):** just this role's cues, large type, dark, made for a booth. The current cue is highlighted when following the console. Scene headers and T· numbers match the paperwork.
- **Paperwork view:** the exact PDFs the desktop prints (spot sheet, or caller sheet for the Caller role).
- **Caller role:** choose which spots to show (e.g. Spots 1 and 3), in both views.
- **Locked:** everything is read-only except typing in When and Notes.
- **Status:** connected or standalone, last synced, and suggestions waiting to be sent.

## Edits and approval

- An iPad edit to When or Notes becomes a **suggestion**: it shows on that iPad marked "pending".
- Connected: the suggestion goes straight to the desktop. Standalone: it waits on the iPad and is sent when the Mac reconnects.
- On the desktop, suggestions appear in a review list (iPad Sync tab), with a badge on the affected cue. **Accept** writes it into the show and sends it to all iPads. **Reject** tells that iPad to drop it.
- Other iPads see an edit only once it's accepted.
- Notes made while no Mac is connected stay on that iPad (never iPad to iPad) until a Mac connects again.

### Approval on / off

- A per-show switch on the desktop (iPad Sync tab), synced to the iPads so they work the same way standalone.
- **On** (typical during tech): edits are pending suggestions, as above.
- **Off** (typical after tech, once the assistant leaves): an operator's edit is final on their iPad straight away. When a Mac connects again, it goes into the show automatically, no review needed, and then out to the other iPads.
- With approval off, if two iPads changed the same line while apart, the newest edit wins and the desktop keeps a note of the one it replaced, so nothing disappears silently.

## Sync model

- The desktop is the source of truth. A show is sent as a full snapshot: the same data as a `.spotplot` export (`src/showFile.js`), plus the role's PDFs. After that, changes go out as they happen.
- Each change carries a version number, so an iPad that was away knows exactly what it missed.
- Clashes: a suggestion is based on the version the operator saw. If the desktop changed that line since, the review list shows both versions to choose from.
- The format stays platform-neutral (JSON over a standard socket), so an Android app can join later.

## Desktop changes

- A small built-in server in `main.js`, the network announcement, and pairing.
- The **iPad Sync** tab (currently a placeholder) lists every iPad: device name, role, connected or last seen, pending suggestions. It also holds the review list and the pairing code.
- The dashboard's iPad Sync dot turns green while iPads are connected.
- The first time, macOS asks to allow incoming network connections; the iPad asks for Local Network permission.

## Following the console

- Each **iPad** connects to the Eos console directly and listens for cue events (OSC). That way, following keeps working after the Mac leaves. The desktop can follow too, but nothing depends on it.
- "Follow console" is a toggle on each iPad.
- **Decided: Eos first,** then grandMA. Each console gets a small adapter that turns its messages into "cue X fired", so the rest of the app doesn't care which console it is.
- **Safety: listen only.** SpotPlot never sends commands to the console.

### Now / Next bar

A slim bar pinned at the top of the iPad while following:

- **Console:** the console's current cue and its next cue, e.g. `NOW 13  ·  NEXT 14`, with the fade's progress while a cue is running.
- **This spot:** what this operator does next and how far away it is, e.g. `Your next: LQ 15 · Pick Up Nora · 2 cues away`. This is what an operator actually needs at a glance: "am I up?"

### How the list follows

- When the console fires a cue that has a SpotPlot cue with the same LQ (e.g. the console goes to 13 and SpotPlot has LQ 13), that cue becomes **live**: strongly highlighted, and the list glides it into place near the top.
- Most console cues have no spot action. Then the **last spot cue at or before** the console's cue stays live, so the operator always sees "where we are" for their spot, with the next one ready below it.
- The next spot cue gets a softer **"up next"** highlight, so the operator can see it coming.
- **Scrolling away pauses following.** If the operator scrolls to look ahead, the list stops moving; a "Back to live" button (or a few seconds without touching) snaps it back.
- Cue matching: numbers compare as numbers (13 = 13.0; 13.5 falls between 13 and 14), and console cue lists (e.g. 2/13) map to SpotPlot when a show uses more than one list. Cues the console skips (Go To Cue) just jump the highlight there.
- Caller role: the same following, across all the spots the caller has chosen.
- To verify with the free Eos Nomad software before building: how several listeners connect at once (OSC over TCP), which cue events the console sends, and matching console cue lists to SpotPlot LQs (including cue list numbers like 1/25).

## Licensing

- **Decided:** the iPad app is free and has no license checks of its own. The only way an iPad gets a show is by syncing from SpotPlot on a Mac, and SpotPlot only runs with a valid license, so the license is enforced on the Mac.
- The iPad **never locks itself**, connected or not. If the Mac's license expires, SpotPlot on the Mac stops at its license screen and simply can't send new shows or updates; shows already on the iPads keep working.
- **Decided (2026-10-17): the iPad can open `.spotplot` files** (AirDrop, Mail, Files), for theatres where sync isn't set up. This still keeps the license on the Mac: a `.spotplot` file can only be made by a licensed SpotPlot. A file-opened show links up with its Mac if that Mac pairs later.
- Knock-on: the Production plan's device count (spots × 2 + 2) assumed operators count as devices. With free iPads it only needs to cover the design team's Macs. Revisit before that plan launches.

## Technology

- **iPad app:** native Swift / SwiftUI. Bonjour discovery, PDFKit for the sheets, local storage for standalone use, network access for OSC. (A web app can't do discovery or raw network connections, so it's out.)
- Needs Xcode and the existing Apple Developer account. Beta through TestFlight, then the App Store.
- **Desktop:** Node's built-in networking plus a Bonjour library, inside the existing Electron app.
- A separate repo for the iPad app (e.g. `spotplot-ipad`).

## Phases

1. **Connect and view** (built 2026-10-17, in `~/Desktop/spotplot-ipad`; still to check landscape and a real iPad): desktop announces and pairs; the iPad downloads a show, picks a role, shows the cue list and PDFs, and works standalone. The desktop lists connected iPads.
2. **Suggestions:** When/Notes editing on the iPad, the offline queue, and the desktop review list.
3. **Live sync:** desktop edits reach connected iPads instantly; versioned catch-up after reconnecting.
4. **Follow console:** Eos listening on the iPad, the Now / Next bar, live and up-next highlights, scroll-to-pause.
5. **Polish:** onboarding, TestFlight beta, then the App Store.

## Phase 1 design (decided 2026-10-17)

The look: an Apple app, not a generic one. Native SwiftUI controls, SF Pro, SF Symbols, the system's dark materials, standard navigation and sheets. Nothing custom where Apple has a control for it. Colors and sizes follow `DESIGN.md`.

- **Devices:** iPad only. iPadOS 26 and newer. Both orientations.
- **Appearance:** always dark.
- **Layout:** full screen, one show at a time. A top bar with the show and role as the title ("The Lighthouse · Spot 1"); tap it to change show or role. Changing role asks to confirm ("Switch to Spot 2?") so a bumped iPad doesn't change role mid-show. The iPad remembers its show and role.
- **Two views:** Cue List and Paperwork, switched with a segmented control. Opens to whichever the operator used last.
- **Cue list:** large type, dark. Which details show (action, character, intensity, iris, color, time, When, Notes) defaults to the Mac's Cue Settings → Show on print, and each operator can turn details on or off on their iPad. Off cues show as slim, dimmed rows (a switch hides them). Color shows the frame number only ("F2"), with the yellow color-change highlight from the printed sheets. Scene headers and T· numbers match the paperwork.
- **Caller role:** side by side like the caller sheet, a column for each spot the caller chose.
- **Color load:** this spot's frames in one row at the top of the cue list (like the Mac's header color load); tap to show or hide, remembered.
- **Text size:** pinch, or a text-size control; remembered per iPad.
- **Screen:** stays awake while a show is open.
- **First launch:** one short welcome screen with a Find Your Mac button, then the list of Macs nearby and the pairing code.
- **Updates (until live sync):** the iPad checks for changes automatically whenever the Mac is reachable (on open and every so often) and on pull-to-refresh, but never changes the show without asking: a banner at the top ("Updates from Maya's MacBook · 4 cues changed  [See changes] [Update]") that never covers the cue list. The operator taps Update when ready.
- **Changes view:** every update, newest first, with its date and what changed in this role's cues (e.g. "LQ 14: Fade Out → Bump Out"). Also shows what an update would change before accepting it.
- **Opening `.spotplot` files:** tap a file in AirDrop, Mail or Files to open it as a show. Opening a newer file of a show already on the iPad works like an update (banner, changes, confirm).
- **Paperwork for file-opened shows:** the Mac's `.spotplot` export also carries each spot sheet and the caller sheet as PDFs, so the iPad has the exact paperwork without a connection.
- **Name and icon:** "SpotPlot", the same icon as the Mac app ("SpotPlot for iPad" on the App Store).
- **Code:** `~/Desktop/spotplot-ipad`, its own private GitHub repo `spotplot-ipad`.
- **Testing:** the iPad simulator on the Mac for now (it reaches the Mac's sync server at localhost); real iPads later.

## Decided details

- Operators don't see how many iPads are on their spot.
- No notice to the operator when a suggestion is accepted or rejected; it just updates.
- Following shows the console's current and next cue (see Now / Next bar).

## Open questions

- None right now. Add new ones here as they come up.
