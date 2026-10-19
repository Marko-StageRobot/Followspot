#!/bin/sh
# Builds fmp2spotplot, the small program SpotPlot uses to read FileMaker (.fmp12) followspot shows.
# Needs the Mac's command line tools (clang). Run automatically by forge.config.js before
# `npm start` and `npm run make`; output goes to native/filemaker-reader/build/ (gitignored).
set -e
cd "$(dirname "$0")"
mkdir -p build
SRC="fmptools/block.c fmptools/dump_file.c fmptools/fmp.c fmptools/scsu.c fmptools/list_columns.c fmptools/list_tables.c fmptools/read_values.c fmp2spotplot.c"
# Rebuild only when a source file is newer than the program
if [ -x build/fmp2spotplot ] && [ -z "$(find $SRC -newer build/fmp2spotplot)" ]; then exit 0; fi
clang -O2 -mmacosx-version-min=12.0 -arch arm64 -DVERSION='"spotplot"' -Ifmptools -o build/fmp2spotplot $SRC -liconv
echo "Built native/filemaker-reader/build/fmp2spotplot"
