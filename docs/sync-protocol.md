# Desktop ↔ iPad sync protocol

The contract between SpotPlot on the Mac (`src/ipadSync.js`) and SpotPlot for iPad. **Both apps must follow this document.** Change it in the same commit as the code, and bump the version on any change the other side would notice.

**Protocol version: 1** (desktop sends it in `/api/hello` and in its Bonjour record as `protocol=1`).

## Rules for changing it

- **Adding** a field or endpoint that older apps can ignore: no version bump; note it below.
- **Changing or removing** anything, or changing what a field means: bump the version. Each app checks the other's version and shows "Update SpotPlot on your Mac / iPad" instead of misbehaving.
- **Show data** is a `.spotplot` export, so any change to show data (new columns, new JSON on `shows`, new tables) is also a change here. Add it to the "Show data" notes.

## Finding and pairing

- The Mac advertises Bonjour service `_spotplot._tcp` (name "SpotPlot on <Computer Name>", TXT `protocol=1`) while Show Settings → iPad Sync → "Let iPads connect" is on.
- Port 47800 by default; any free port if that's taken (Bonjour carries the real one). The iPad Sync tab shows the address for typing in by hand.
- Plain HTTP on the local network, JSON bodies.

## Endpoints

| Request | Auth | Body / query | Response |
|---|---|---|---|
| `GET /api/hello` | none | | `{ app: "SpotPlot", protocol, version, name }` |
| `POST /api/pair` | none | `{ code, deviceId, deviceName }` | `200 { token, name }`; `403` wrong code; `429` after 5 wrong codes in a minute |
| `POST /api/presence` | token | `{ showId, role, spots }` (role `spot` or `caller`; `spots` = spot numbers) | `{ ok: true }`. Send every ~5 s; the Mac shows an iPad as online if seen in the last 15 s |
| `GET /api/shows` | token | | `{ shows: [{ id, title, theatre, num_spots, version }] }` |
| `GET /api/shows/:id` | token | | the `.spotplot` export JSON plus `sync_version` |
| `GET /api/shows/:id/pdf` | token | `kind=spot&spotId=…` or `kind=caller` | `application/pdf` |

Auth: `Authorization: Bearer <token>` from pairing. `401` means the iPad was forgotten on the Mac and must pair again.

## Show data notes

- `version` / `sync_version`: a fingerprint of the show's rows (not images). Same value means the iPad's copy is current.
- Images are inside the export as base64 (`images[path]`).
- Color frames can hold several gels: `gel_number` "R02+R132", `gel_name` "Bastard Amber + Quarter Hamburg Frost".
- `shows.iris_sizes` is a JSON array `{ label, value, builtin?, key? }` in display order (see `src/irisSizes.js`). `spot_cues.frame_size` holds the size's `value`.
- `shows.cue_fields` is JSON `{ field: { list, print } }` (see `src/cueFields.js`).
- When and Notes (`spot_cues.description`, `spot_cues.notes`) contain simple HTML (`<b>`, `<i>`, `<u>`; see `src/richText.js`).

## Coming in later phases

Suggestions (iPad edits to When/Notes), the approval switch, and live updates. Add each endpoint here when it's built.
