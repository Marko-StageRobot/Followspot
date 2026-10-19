/* fmp2spotplot - read a FileMaker file (such as a followspot show's FS_Track.fmp12) and print it as JSON
 * for SpotPlot's "Import from FileMaker". Built on FMP Tools by Evan Miller (MIT license).
 *
 * Output: { "tables": [ { "name": ..., "columns": [...],
 *                         "rows": [ { column: value, ... }, ... ],
 *                         "globals": { column: value, ... } } ] }
 *
 * "globals" are FileMaker global fields: one value per file, not per record. The followspot template keeps its
 * whole setup (show title, operators, gels, team) in globals, which the stock FMP Tools skip.
 * They live at [table].[8], keyed by the same column numbers as records at [table].[5]. */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "fmptools/fmp.h"
#include "fmptools/fmp_internal.h"

static void print_json_string(const char *s) {
    putchar('"');
    for (const unsigned char *p = (const unsigned char *)s; *p; p++) {
        switch (*p) {
            case '"': fputs("\\\"", stdout); break;
            case '\\': fputs("\\\\", stdout); break;
            case '\n': fputs("\\n", stdout); break;
            case '\r': fputs("\\n", stdout); break;   /* FileMaker line breaks are CR */
            case '\t': fputs("\\t", stdout); break;
            default:
                if (*p < 0x20) printf("\\u%04x", *p);
                else putchar(*p);
        }
    }
    putchar('"');
}

/* ---- records ---- */

typedef struct {
    int last_row;
    int rows_printed;
} rows_ctx_t;

static fmp_handler_status_t handle_value(int row, fmp_column_t *column, const char *value, void *ctxp) {
    rows_ctx_t *ctx = ctxp;
    if (row != ctx->last_row) {
        if (ctx->rows_printed) fputs("},\n", stdout);
        fputs("{", stdout);
        ctx->rows_printed++;
        ctx->last_row = row;
    } else {
        fputs(",", stdout);
    }
    print_json_string(column->utf8_name);
    putchar(':');
    print_json_string(value);
    return FMP_HANDLER_OK;
}

/* ---- globals ---- */

typedef struct {
    fmp_file_t *file;
    int table_index;
    fmp_column_array_t *columns;
    /* one buffer per column; long text arrives in several segments */
    char **values;
    size_t *lengths;
} globals_ctx_t;

static void append_global(globals_ctx_t *ctx, size_t column, uint8_t *bytes, size_t len) {
    if (column < 1 || column > FMP_MAX_INDEX) return;
    size_t i = column - 1;
    size_t need = 4 * len + 1;
    ctx->values[i] = realloc(ctx->values[i], ctx->lengths[i] + need);
    convert(ctx->file->converter, ctx->file->xor_mask, ctx->values[i] + ctx->lengths[i], need, bytes, len);
    ctx->lengths[i] += strlen(ctx->values[i] + ctx->lengths[i]);
}

static chunk_status_t handle_global_chunk(fmp_chunk_t *chunk, void *ctxp) {
    globals_ctx_t *ctx = ctxp;
    if (chunk->version_num < 7) return CHUNK_DONE;
    uint64_t t = path_value(chunk, path_at(chunk, 0));
    if (t < (uint64_t)ctx->table_index + 128) return CHUNK_NEXT;
    if (t > (uint64_t)ctx->table_index + 128) return CHUNK_DONE;
    if (chunk->path_level < 2 || !path_is(chunk, path_at(chunk, 1), 8)) return CHUNK_NEXT;

    if (chunk->path_level == 2) {
        if (chunk->type == FMP_CHUNK_FIELD_REF_SIMPLE && chunk->ref_simple != 252) {
            append_global(ctx, chunk->ref_simple, chunk->data.bytes, chunk->data.len);
        } else if (chunk->type == FMP_CHUNK_DATA_SEGMENT) {
            append_global(ctx, chunk->segment_index, chunk->data.bytes, chunk->data.len);
        }
    } else if (chunk->path_level == 3 && chunk->type == FMP_CHUNK_DATA_SEGMENT) {
        /* long text stored under its own column node */
        append_global(ctx, path_value(chunk, path_at(chunk, 2)), chunk->data.bytes, chunk->data.len);
    }
    return CHUNK_NEXT;
}

static void print_globals(fmp_file_t *file, fmp_table_t *table, fmp_column_array_t *columns) {
    size_t max = 0;
    for (size_t j = 0; j < columns->count; j++)
        if ((size_t)columns->columns[j].index > max) max = columns->columns[j].index;
    globals_ctx_t ctx = { file, table->index, columns, calloc(max + 1, sizeof(char *)), calloc(max + 1, sizeof(size_t)) };
    if (max > 0) process_blocks(file, NULL, handle_global_chunk, &ctx);
    fputs("\"globals\":{", stdout);
    int first = 1;
    for (size_t j = 0; j < columns->count; j++) {
        int i = columns->columns[j].index;
        if (i < 1 || (size_t)i > max || !ctx.values[i - 1] || !ctx.lengths[i - 1]) continue;
        if (!first) putchar(',');
        first = 0;
        print_json_string(columns->columns[j].utf8_name);
        putchar(':');
        print_json_string(ctx.values[i - 1]);
    }
    fputs("}", stdout);
    for (size_t i = 0; i <= max; i++) free(ctx.values[i]);
    free(ctx.values);
    free(ctx.lengths);
}

int main(int argc, char *argv[]) {
    if (argc != 2) {
        fprintf(stderr, "Usage: %s file.fmp12\n", argv[0]);
        return 1;
    }
    fmp_error_t error = FMP_OK;
    fmp_file_t *file = fmp_open_file(argv[1], &error);
    if (!file) {
        fprintf(stderr, error == FMP_ERROR_ENCRYPTED_FILE ? "encrypted\n" : "open-failed %d\n", error);
        return 2;
    }
    fmp_table_array_t *tables = fmp_list_tables(file, &error);
    if (!tables) {
        fprintf(stderr, "list-tables-failed %d\n", error);
        fmp_close_file(file);
        return 3;
    }
    fputs("{\"tables\":[\n", stdout);
    int first_table = 1;
    for (size_t t = 0; t < tables->count; t++) {
        fmp_table_t *table = &tables->tables[t];
        if (table->skip) continue;
        fmp_column_array_t *columns = fmp_list_columns(file, table, &error);
        if (!columns) continue;
        if (!first_table) fputs(",\n", stdout);
        first_table = 0;
        fputs("{\"name\":", stdout);
        print_json_string(table->utf8_name);
        fputs(",\"columns\":[", stdout);
        for (size_t j = 0; j < columns->count; j++) {
            if (j) putchar(',');
            print_json_string(columns->columns[j].utf8_name);
        }
        fputs("],\n\"rows\":[\n", stdout);
        rows_ctx_t ctx = { -1, 0 };
        fmp_read_values(file, table, handle_value, &ctx);
        if (ctx.rows_printed) fputs("}", stdout);
        fputs("],\n", stdout);
        print_globals(file, table, columns);
        fputs("}", stdout);
        fmp_free_columns(columns);
    }
    fputs("\n]}\n", stdout);
    fmp_free_tables(tables);
    fmp_close_file(file);
    return 0;
}
