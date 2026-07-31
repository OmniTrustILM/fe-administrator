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
import { fileURLToPath } from 'node:url';

const CONTACT = 'ilm@omnitrust.com';
const CONTACT_LINE = /^( \* Contact: ).*$/m;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const coreDir = path.join(root, 'src', 'types', 'openapi');
const utilsDir = path.join(coreDir, 'utils');

function* walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (full === utilsDir) continue;
            yield* walk(full);
        } else if (entry.name.endsWith('.ts')) {
            yield full;
        }
    }
}

let changed = 0;
for (const file of walk(coreDir)) {
    const source = readFileSync(file, 'utf8');
    if (!CONTACT_LINE.test(source)) continue;
    const updated = source.replace(CONTACT_LINE, `$1${CONTACT}`);
    if (updated !== source) {
        writeFileSync(file, updated);
        changed += 1;
    }
}

console.log(`set Contact: ${CONTACT} in ${changed} generated file(s)`);
