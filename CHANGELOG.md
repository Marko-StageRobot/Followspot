# SpotPlot Changelog

Every change a user would notice, written in plain words, added **when the change is made** (under Unreleased). At release time, Unreleased becomes the release notes and gets a version number. Older releases: https://github.com/wheeler-moon/Followspot/releases

Sections: Cue list · Printing · Spots & shows · iPad · Fixes · Other. Website and license-server changes are noted under Other when they affect users.

## Unreleased

- The window's grey title bar is gone: the red, yellow and green window buttons now sit in SpotPlot's own top bar, like Apple's apps on current macOS. Drag the window by any empty part of the top bar, or double-click it to zoom

## SpotPlot for iPad (not released yet)

Saved for the iPad app's first release (kept out of the Mac's What's New).

- Jump to Scene (the list button in the top bar) scrolls straight to any scene, like the Mac's Jump to
- Action Words and Action Symbols are separate switches in the ⋯ menu, for operators who want only symbols or only words
- A color that's the same as the cue before shows in grey; changes stay highlighted in yellow
- A cue where a spot carries on never shows the word "Tracked"; it reads like any untouched cue (and Hide Tracked hides it)
- Hide Off and Hide Tracked switches (tracked cues hidden by default), a T· Numbers switch, a color load button like the Mac's, intensity stacked over iris, bigger action symbols, and color frames that never wrap ("F1+2" on one line)
- The Caller view now looks like the printed caller sheet, with each spot's color load lined up over its column. A strong line separates cues and a short faint one separates spots, so each cue reads as one row, and every spot's When box in a cue starts at the same height
- Highlighted cues stand out more (a tinted row with a solid bar on its left edge), and rows alternate shades so they're easier to tell apart
- Tap a cue to flag it **Missed**, **Clarify** or **Idea**. The Flags button lists them all in cue order, filters by kind, shares them as text, and clears them after the show

## 0.4.0 (2026-10-22)

New: **Import from FileMaker.** Bring followspot shows over from a FileMaker database (the FileMaker followspot paperwork many designers use), without needing FileMaker: Home → Import ▾ → FileMaker Show…, or File → Import from FileMaker…. Choose the show's FS_Track.fmp12 (SceneList.fmp12 next to it comes too). The show's details, team, spots and gels, characters, scenes and every cue come across; actions or iris sizes in the file that aren't exactly SpotPlot's are matched by you, or kept as custom ones.

Cue list
- The actions Fade Up and Fade Down are now called **Increase** and **Decrease**, everywhere: the cue list, prints, the action key and the FileMaker import. Shows you already have (and older .spotplot files) switch over automatically
- A spot's lit color frames show bright blue in the cue where its color changes and muted when they're the same as its cue before, so color changes stand out. On spot sheets and the caller sheet, a color that's the same as the spot's cue before now prints grey; changes stay highlighted in yellow
- Right-click a spot's box in a cue for a real Mac menu: **Copy Cue** and **Paste Cue** (or Paste Cue Without Character) to copy what a spot does into another spot or cue, a **Highlight** submenu (whole cue, When line, Notes line), **Ignore Cue**, **Add Spot Note…**, **Insert Cue Above / Below**, **Delete** the cue, and **Clear Cue**, which empties the box so you can start that cue from scratch (a spot that's Off stays Off). ⌘Z undoes paste, highlight, ignore and clear
- Click the little color button next to a spot's name at the top of the cue list to keep that spot's whole color load in view (frames and permanent color). It stays open until you close it, even after leaving the cue list
- Double-clicking a word in When or Notes selects that word, like any text box. Double-click anywhere else in a spot's box to open its options
- Renumber T· can be undone: press ⌘Z right after to put every cue's old T· number back
- Each cue can note its script page: click the small "pg" next to T· and type it (like 13 or 13a)

Printing
- On spot sheets and the caller sheet, a cue where a spot has no action (it carries on, like a cue you inserted and didn't change for that spot) prints all in grey, without an action, so the eye goes to the cues that need it
- New: **Action key**, one page showing every action symbol and its name, including your show's custom actions. "Only this show's actions" leaves out the ones no cue uses
- New: **Scene list**, every scene in order with its song, number of cues, LQ and T· range and script pages, with act breaks marked
- Two or more color frames now print as **F1+2** (not F1+F2) on spot sheets and the caller sheet
- New **Cover page** switch for the caller sheet and spot sheets: a bordered first page with the label, the show name and a large logo, the theatre and producer, each spot's number, operator, position and fixture with its color load (just that spot's on a spot sheet; on the caller sheet every spot's frames line up in the same columns), a key to the action symbols the show uses, and the lighting team along the bottom

Spots & shows
- Spots can have fewer than six color frames. Hover a frame in Spot Settings or New Show and click the small red × to remove it; "+ Add frame" brings it back. Frames keep their numbers (remove Frame 5 and the spot has F1–F4 and F6), and the cue list, prints and color load only show the frames a spot has. If cues use the frame you're removing, you can switch them to another frame or take it out of them
- Deleting a spot no longer renumbers the others: delete Spot 2 and the show keeps Spots 1 and 3. The delete box offers "Renumber spots" if you'd rather close the gap, and + Add Spot fills the lowest free number

iPad Sync (for SpotPlot for iPad, coming soon)
- iPad Sync is now per show: each show has its own "Let iPads connect to this show" switch and its own code, in that show's Show Settings → iPad Sync. An iPad that enters a show's code gets that show only, never the other shows on the Mac. Turning a show's switch off hides it from iPads. iPads paired before this change need to enter the show's code once
- If SpotPlot crashed while iPad Sync was on, iPads could see the Mac twice; that's cleared the next time iPad Sync starts
- The show dashboard's iPad Sync button shows one green dot for each iPad connected to the show (3 iPads, 3 dots); with more than 6 it shows the number

Other
- Settings (home screen) is reorganized like a Mac's System Settings. **Account** shows your email, plan, status (renewal date or any payment problem, once subscriptions start) and your license key, hidden except the last part, with a Copy button. **Deactivate…** takes this Mac off your license so you can move SpotPlot to another Mac. **Updates** has a switch for automatic checks, a Check Now button and when it last checked; SpotPlot also re-checks every few hours while open. **Help & Feedback** and **About** round it out; **What's New** opens by itself the first time SpotPlot starts after an update, showing what changed in that version (it's built into the app, so no internet needed), and any time from Settings → About
- Settings opens even when there are no shows yet
- Settings → About links to the new Terms of Service and Privacy Policy on spotplotapp.com.
- Exported .spotplot files now carry the printed spot sheets and caller sheet, so SpotPlot for iPad (coming soon) has the paperwork for a show opened from a file. Files are a little bigger; other Macs open them as before
- Help → Send Feedback… starts an email to support with your SpotPlot version, macOS version and Mac type filled in. Help → Contact Support does the same

Fixes
- Dragging a cue cell and then letting go without moving it no longer leaves the cell highlighted

## 0.3.1 (2026-10-14)

Cue list
- Custom fade times (like 2.5s) now show in the cue list, not just on prints
- The iris size buttons show a ‹ arrow on the left once you've scrolled, as well as the › arrow on the right, so you can tell there are more sizes either way

Printing
- Caller sheet: each spot's color load sits centered over its own column, and the permanent color shows as a PERM frame
- Color load: a frame with more than one gel is split into stacked bands, one per gel, in each gel's color
- Spot sheets: the gel load at the top shows gel numbers only (names stay on the Color Load), and the PERM box's border is no longer cut off

Spots & shows
- A color frame can hold more than one gel (e.g. R02+R132): "+ Add gel" in New Show and Show Settings → Spot Settings
- Copy colors from… also copies the fixture type
- Complete gel catalog: 1,136 gels straight from the makers' current lists: Rosco (Roscolux, Cinegel and CalColor, e.g. R4615), Rosco E-Colour+, Lee (including the 300–700s and Zircon) and GAM GamColor. Names are corrected, and a few numbers that aren't on any maker's list were removed
- Gel swatches and the Color Load use each gel's real color from the maker
- Any gel can be typed, even one not in the list: it's kept exactly as typed, prints like any other gel, and shows as clear/white. Typing an exact number (like r4615) fills in its name
- Gel search puts an exact number match first
- Show Settings → Iris Sizes: rename any size (including the built-in ones), drag ⠿ to reorder, and Reset a renamed built-in size. Renaming updates every cue that uses it
- The show dashboard lists spots in number order, whatever order is set in Spot Order

iPad
- Show Settings → iPad Sync: "Let iPads connect to this Mac", a pairing code, and a list of paired iPads with who's online. The dashboard's iPad Sync dot turns green while iPads are connected (the iPad app itself is coming)

Other
- Help → SpotPlot Website and Settings now open spotplotapp.com

## 0.3.0 (2026-10-10)

New: tips that walk you through each screen the first time you open it. Help → Show Tips Again brings them back any time.

Cue list
- "Renumber T·" button cleans up spot cue numbers to 1, 2, 3… without changing your cue order
- New "Dump & Restore" action
- Scene headers stay pinned at the top while you scroll (act breaks in orange)
- More room between spots
- Shows "Loading cues…" while a show opens, instead of an empty list

Printing
- Redesigned caller sheet: iris, color and time in one labeled strip; When and Notes in their own box
- Color changes are highlighted in yellow, including each spot's first color
- T· numbers printed small under each LQ (switch on the Print page)
- "Page 1 of 31" at the bottom of every page
- Cues never split across two pages
- Refreshed Spot Notes sheet

Spots & shows
- Permanent color: mark a gel that always stays in the fixture (shows on the Color Load sheet)
- Cue Settings: choose which cue details appear on the cue list and on prints
- Updated fixture list
- New show dashboard and a refreshed design throughout
- iPad Sync tab (iPad app coming soon)

Installer
- Proper license agreement window

## 0.2.1 (2026-09-30)

Printing
- New print page: pick what to print and see a live preview of the actual PDF, with exact page breaks
- New Characters sheet: cast photos, actors and costume notes on one page (choose who prints)

Cue list
- Action and character on one larger, easier-to-read row
- "w/ LQ" is now a switch that follows the cue number automatically
- Bold, italic and underline in When and Notes (Cmd+B / Cmd+I / Cmd+U)
- Highlight just the When or Notes line, not only the whole cue
- Iris sizes scroll sideways instead of crowding the row
- New custom character names can be added to the show's character list

Spots & shows
- Swap all cue data between any two spots
- Copy gel colors from one spot to another
- Show exports now include everything: highlights, notes, formatting, photos and logos
- Double-click a .spotplot file to import it; show files now have the SpotPlot icon

Fixes
- Show logos now save when creating a new show
- Photos and logos are kept safely even if the original file is moved
- Dropping a photo onto a character works
- Spot columns stay equal widths

Licensing
- Each license can be used on up to 2 Macs
