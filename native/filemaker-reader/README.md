# FileMaker reader

`fmp2spotplot` reads a FileMaker followspot show (`.fmp12`, e.g. `FS_Track.fmp12` and `SceneList.fmp12`) and prints every table as JSON, for File → Import from FileMaker… (`src/fileMakerImport.js`).

- `fmptools/`: the reading library from [FMP Tools](https://github.com/evanmiller/fmptools) by Evan Miller, MIT license (`fmptools/LICENSE`), copied unchanged from commit fd32a6c.
- `fmp2spotplot.c`: ours. Like FMP Tools' converters, plus **global fields**, which the followspot template uses for its whole setup (show title, operators, gels, team) and which FMP Tools skips. They're stored at `[table].[8]`, keyed by the same field numbers as records at `[table].[5]`.
- `build.sh` compiles it into `build/` (gitignored); `forge.config.js` runs it before `npm start` and `npm run make`, and the packaged app carries it in `Contents/Resources`.

Encrypted FileMaker files can't be read; the import says so.
