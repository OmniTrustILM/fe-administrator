// Rewrite the `Contact:` line in the generated core OpenAPI headers.
//
// The generator copies `info.contact.email` out of the core spec, which currently
// publishes `info@otilm.com`. The rebrand requires the ILM support address instead,
// so this runs after every core generation to keep the headers on it. Drop this
// script (and the generate-types* hooks) once the core spec publishes the address
// itself. Only the core tree is touched; src/types/openapi/utils is generated from
// the not-yet-rebranded utils-service spec and is left alone.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const CONTACT = 'ilm@omnitrust.com';

const CONTACT_LINE = /^( \* Contact: ).*$/m;

/** Replace the address on the header's `Contact:` line, leaving everything else intact. */
export function setContactInSource(source, contact = CONTACT) {
    return source.replace(CONTACT_LINE, `$1${contact}`);
}

/** Yield every `.ts` file under `dir`, skipping any directory listed in `skipDirs`. */
export function* walkTypeScriptFiles(dir, skipDirs = []) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (skipDirs.includes(full)) continue;
            yield* walkTypeScriptFiles(full, skipDirs);
        } else if (entry.name.endsWith('.ts')) {
            yield full;
        }
    }
}

/** Rewrite the contact across a generated tree; returns how many files changed. */
export function setContactInTree(coreDir, { contact = CONTACT, skipDirs = [] } = {}) {
    let changed = 0;
    for (const file of walkTypeScriptFiles(coreDir, skipDirs)) {
        const source = readFileSync(file, 'utf8');
        const updated = setContactInSource(source, contact);
        if (updated !== source) {
            writeFileSync(file, updated);
            changed += 1;
        }
    }
    return changed;
}

export function run(root) {
    const coreDir = path.join(root, 'src', 'types', 'openapi');
    const changed = setContactInTree(coreDir, { skipDirs: [path.join(coreDir, 'utils')] });
    console.log(`set Contact: ${CONTACT} in ${changed} generated file(s)`);
    return changed;
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
    run(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
}
