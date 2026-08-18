// Rename the generated runtime's custom `query` prop to the standard `queryParams`.
//
// `RequestOpts` extends RxJS Ajax's `AjaxConfig`, which already declares `queryParams`.
// The typescript-rxjs template adds a second, parallel `query` prop and leaves a note in
// the generated source flagging it: a caller who reasonably sets `queryParams` gets a request without a query
// string, because only `query` is read. This renames the prop (and every call site the
// generator emits) so there is one query prop under the standard name, narrowed to
// `HttpQuery` the same way `method`, `headers` and `body` already are. Serialization is
// untouched — the runtime still builds the query string with its own `queryString`
// helper rather than handing the params to rxjs, which joins arrays with a comma
// instead of repeating the key.
//
// Runs after every generation, because the generated files are overwritten each time.

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { walkTypeScriptFiles } from './set-openapi-contact.mjs';

const REQUEST_OPTS_PROP =
    /export interface RequestOpts extends AjaxConfig \{\n(?:[^\n]*\/\/ TODO: replace custom 'query' prop with 'queryParams'\n)?[ \t]*query\?: HttpQuery;[^\n]*\n/;

const REQUEST_OPTS_REPLACEMENT = `export interface RequestOpts extends Omit<AjaxConfig, 'queryParams'> {
    // narrowed from AjaxConfig: this runtime serializes the query string itself
    queryParams?: HttpQuery;
`;

const CREATE_REQUEST_ARGS_PARAM = /(\{ url: baseUrl, )query(, method, headers, body, responseType \}: RequestOpts)/;

const QUERY_STRING_INTERPOLATION = /\$\{query && Object\.keys\(query\)\.length \? `\?\$\{queryString\(query\)\}` : ''\}/;

// Escaped rather than interpolated: this is the source text the generated runtime keeps.
const QUERY_STRING_REPLACEMENT = `\${queryParams && Object.keys(queryParams).length ? \`?\${queryString(queryParams)}\` : ''}`;

const API_QUERY_DECLARATION = /\bconst query(: HttpQuery)\b/g;
const API_QUERY_ASSIGNMENT = /\bquery(\['[^'\n]+'\] =)/g;
const API_QUERY_SHORTHAND = /^([ \t]*)query,$/gm;

/** Rewrite the `query` prop of `RequestOpts` and the two places the runtime reads it. */
export function patchRuntimeSource(source) {
    return source
        .replace(REQUEST_OPTS_PROP, REQUEST_OPTS_REPLACEMENT)
        .replace(CREATE_REQUEST_ARGS_PARAM, '$1queryParams$2')
        .replace(QUERY_STRING_INTERPOLATION, QUERY_STRING_REPLACEMENT);
}

/**
 * Rewrite the `query` object each generated operation builds. Only the three shapes the
 * generator emits are matched, so prose that happens to mention a query is left alone.
 */
export function patchApiSource(source) {
    return source
        .replace(API_QUERY_DECLARATION, 'const queryParams$1')
        .replace(API_QUERY_ASSIGNMENT, 'queryParams$1')
        .replace(API_QUERY_SHORTHAND, '$1queryParams,');
}

export function patchSource(source) {
    return patchApiSource(patchRuntimeSource(source));
}

/** Patch a generated tree; returns how many files changed. */
export function patchTree(dir, { skipDirs = [] } = {}) {
    let changed = 0;
    for (const file of walkTypeScriptFiles(dir, skipDirs)) {
        const source = readFileSync(file, 'utf8');
        const updated = patchSource(source);
        if (updated !== source) {
            writeFileSync(file, updated);
            changed += 1;
        }
    }
    return changed;
}

export function run(root) {
    const coreDir = path.join(root, 'src', 'types', 'openapi');
    const changed = patchTree(coreDir, { skipDirs: [path.join(coreDir, 'utils')] });
    console.log(`replaced the custom query prop with queryParams in ${changed} generated file(s)`);
    return changed;
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
    run(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
}
