// Prove that a spec version bump only changes src/types/openapi/API_VERSION.
//
// Generates the fixture spec through the same generator key, template override,
// post-processing and formatting as `npm run generate-types-local`, varying one input
// at a time: the `info.version`, nothing at all, and a schema property. Needs Java, and
// downloads the pinned generator jar on first use.

import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { patchTree } from './patch-openapi-runtime.mjs';
import { setContactInTree } from './set-openapi-contact.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const coreDir = path.join(root, 'src', 'types', 'openapi');
const fixture = readFileSync(path.join(root, 'scripts', 'fixtures', 'openapi-version-churn', 'spec.yaml'), 'utf8');
const require = createRequire(import.meta.url);
const GENERATOR_KEY = 'typescript-rxjs-local';
const VERSION_FILE = 'API_VERSION';
const MANIFEST = '.openapi-generator/FILES';

function withVersion(spec, version) {
    const updated = spec.replace(/^ {2}version: .*$/m, `  version: ${version}`);
    if (updated === spec) throw new Error('fixture has no info.version line to replace');
    return updated;
}

function withExtraProperty(spec) {
    const anchor = '        status:\n';
    if (!spec.includes(anchor)) throw new Error('fixture has no WidgetDto.status property to extend');
    return spec.replace(
        anchor,
        `        serialNumber:\n          type: string\n          description: Serial number of the widget\n${anchor}`,
    );
}

// Launch the package's JS entrypoint through node: the extensionless .bin shims do not run on Windows.
function cliEntry(pkg, bin) {
    const manifestPath = require.resolve(`${pkg}/package.json`);
    return path.join(path.dirname(manifestPath), JSON.parse(readFileSync(manifestPath, 'utf8')).bin[bin]);
}

function readTree(dir, base = dir, files = new Map()) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) readTree(full, base, files);
        else files.set(path.relative(base, full).split(path.sep).join('/'), readFileSync(full, 'utf8'));
    }
    return files;
}

function generate(exec, workDir, name, spec) {
    const specPath = path.join(workDir, `${name}.yaml`);
    const output = path.join(workDir, name);
    writeFileSync(specPath, spec);
    mkdirSync(output);
    cpSync(path.join(coreDir, '.openapi-generator-ignore'), path.join(output, '.openapi-generator-ignore'));

    const tools = JSON.parse(readFileSync(path.join(root, 'openapitools.json'), 'utf8'));
    const generator = tools['generator-cli'].generators[GENERATOR_KEY];
    tools['generator-cli'].generators = {
        [GENERATOR_KEY]: { ...generator, inputSpec: specPath, output, config: path.resolve(root, generator.config) },
    };
    const toolsPath = path.join(workDir, `${name}.openapitools.json`);
    writeFileSync(toolsPath, JSON.stringify(tools, null, 4));

    const generatorCli = cliEntry('@openapitools/openapi-generator-cli', 'openapi-generator-cli');
    exec(process.execPath, [generatorCli, '--openapitools', toolsPath, 'generate', '--generator-key', GENERATOR_KEY], {
        cwd: root,
        stdio: 'inherit',
    });
    setContactInTree(output);
    patchTree(output);
    exec(process.execPath, [cliEntry('@biomejs/biome', 'biome'), 'format', '--write', '--vcs-use-ignore-file=false', output], {
        cwd: root,
        stdio: 'inherit',
    });
    return readTree(output);
}

function changedPaths(left, right) {
    const paths = new Set([...left.keys(), ...right.keys()]);
    return [...paths].filter((file) => left.get(file) !== right.get(file)).sort((a, b) => a.localeCompare(b));
}

function assertEqual(actual, expected, message) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
    }
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

export function run(exec = execFileSync, spec = fixture) {
    const source = spec.replaceAll('\r\n', '\n');
    const workDir = mkdtempSync(path.join(os.tmpdir(), 'openapi-version-churn-'));
    try {
        const first = generate(exec, workDir, 'first', withVersion(source, '1.0.0-SNAPSHOT'));
        const bumped = generate(exec, workDir, 'bumped', withVersion(source, '1.1.0'));
        const repeated = generate(exec, workDir, 'repeated', withVersion(source, '1.0.0-SNAPSHOT'));
        const changed = generate(exec, workDir, 'changed', withExtraProperty(withVersion(source, '1.0.0-SNAPSHOT')));

        assertEqual(first.get(VERSION_FILE), '1.0.0-SNAPSHOT\n', `${VERSION_FILE} must hold info.version with a trailing newline`);
        assert(first.get(MANIFEST)?.split(/\r?\n/).includes(VERSION_FILE), `${MANIFEST} must register ${VERSION_FILE}`);
        for (const [file, source] of first) {
            if (!file.endsWith('.ts')) continue;
            assert(!source.includes('The version of the OpenAPI document'), `${file} still carries the API version in its header`);
        }
        const header = first.get('models/WidgetDto.ts') ?? '';
        assert(header.includes(' * Core API\n * REST API for ILM Core\n'), 'header lost the API title and description');
        assert(header.includes(' * Contact: ilm@omnitrust.com\n'), 'header lost the contact line');
        assert(header.includes(' * Do not edit the class manually.\n'), 'header lost the generator notice');

        assertEqual(changedPaths(first, bumped), [VERSION_FILE], 'a version-only bump must change API_VERSION and nothing else');
        assertEqual(changedPaths(first, repeated), [], 'regenerating identical input must change nothing');
        assertEqual(changedPaths(first, changed), ['models/WidgetDto.ts'], 'a schema change must reach the generated model');
        assert(changed.get('models/WidgetDto.ts')?.includes('serialNumber?: string;'), 'the added property is missing from the model');

        console.log('OpenAPI generation check passed: a version bump changes only API_VERSION');
    } finally {
        rmSync(workDir, { recursive: true, force: true });
    }
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
    run();
}
