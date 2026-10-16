# SpotPlot Changelog

Every change a user would notice, written in plain words, added **when the change is made** (under Unreleased). At release time, Unreleased becomes the release notes and gets a version number. Older releases: https://github.com/wheeler-moon/Followspot/releases

Sections: Cue list · Printing · Spots & shows · iPad · Fixes · Other. Website and license-server changes are noted under Other when they affect users.

## Unreleased

Cue list
- Right-click a spot's box in a cue for a menu. **Clear cue** empties it so you can start that cue from scratch (a spot that's Off stays Off). ⌘Z brings it all back
- Double-clicking a word in When or Notes selects that word, like any text box. Double-click anywhere else in a spot's box to open its options
- Each cue can note its script page: click the small "pg" next to T· and type it (like 13 or 13a)

Spots & shows
- Spots can have fewer than six color frames. Hover a frame in Spot Settings or New Show and click the small red × to remove it; "+ Add frame" brings it back. Frames keep their numbers (remove Frame 5 and the spot has F1–F4 and F6), and the cue list, prints and color load only show the frames a spot has. If cues use the frame you're removing, you can switch them to another frame or take it out of them

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
