import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// @ts-expect-error - plain ESM build script, no type declarations
import { patchApiSource, patchRuntimeSource, patchSource, patchTree, run } from './patch-openapi-runtime.mjs';
// @ts-expect-error - plain ESM build script, no type declarations
import { walkTypeScriptFiles } from './set-openapi-contact.mjs';

// `spacedColon` picks which side of the pipeline the fixture imitates. The generator emits no
// space before the colon; biome adds one in the step that runs after the patch, so the checked-in
// runtime carries the spaced form. A fixture that only ever showed the spaced form would assert
// against the patch script's own output rather than against what it has to match.
const runtimeSource = (todo = true, spacedColon = true) => `// tslint:disable
import type { AjaxConfig, AjaxResponse } from 'rxjs/ajax';

export class BaseAPI {
    private createRequestArgs = ({ url: baseUrl, query, method, headers, body, responseType }: RequestOpts): AjaxConfig => {
        // only add the queryString to the URL if there are query parameters.
        const url = \`\${this.configuration.basePath}\${baseUrl}\${query && Object.keys(query).length ? \`?\${queryString(query)}\`${spacedColon ? ' ' : ''}: ''}\`;

        return { url, method, headers, body, responseType: responseType ?? 'json' };
    };
}

export interface RequestOpts extends AjaxConfig {
${todo ? "    // TODO: replace custom 'query' prop with 'queryParams'\n" : ''}    query?: HttpQuery; // additional prop
    // the following props have improved types over AjaxRequest
    method: HttpMethod;
    headers?: HttpHeaders;
    body?: HttpBody;
}

const queryString = (params: HttpQuery): string => Object.entries(params).join('&');
`;

const apiSource = `// tslint:disable
import type { HttpQuery, OperationOpts } from '../runtime';

export class CertificateInventoryApi extends BaseAPI {
    /**
     * Map of the query parameters supported by the callback method
     */
    listCertificates({ itemsPerPage, pageNumber }: ListCertificatesRequest, opts?: OperationOpts): Observable<CertificateResponseDto> {
        const query: HttpQuery = {};

        if (itemsPerPage != null) {
            query['itemsPerPage'] = itemsPerPage;
        }
        if (pageNumber != null) {
            query['pageNumber'] = pageNumber;
        }

        return this.request<CertificateResponseDto>(
            {
                url: '/v1/certificates',
                method: 'GET',
                query,
            },
            opts?.responseOpts,
        );
    }
}
`;

describe('patchRuntimeSource', () => {
    it('replaces the custom query prop with the standard queryParams name', () => {
        const patched = patchRuntimeSource(runtimeSource());

        expect(patched).toContain("export interface RequestOpts extends Omit<AjaxConfig, 'queryParams'> {");
        expect(patched).toContain('queryParams?: HttpQuery;');
        expect(patched).not.toContain('query?: HttpQuery');
    });

    it('drops the TODO the generator template leaves behind', () => {
        expect(patchRuntimeSource(runtimeSource())).not.toContain('TODO');
    });

    it('patches a runtime that never carried the TODO', () => {
        const patched = patchRuntimeSource(runtimeSource(false));

        expect(patched).toContain("export interface RequestOpts extends Omit<AjaxConfig, 'queryParams'> {");
        expect(patched).not.toContain('query?: HttpQuery');
    });

    it('renames the prop where the request args are built', () => {
        const patched = patchRuntimeSource(runtimeSource());

        expect(patched).toContain('({ url: baseUrl, queryParams, method, headers, body, responseType }: RequestOpts)');
        expect(patched).toContain(`\${queryParams && Object.keys(queryParams).length ? \`?\${queryString(queryParams)}\` : ''}`);
    });

    it('renames the prop when the generator leaves no space before the colon', () => {
        const patched = patchRuntimeSource(runtimeSource(true, false));

        expect(patched).toContain(`\${queryParams && Object.keys(queryParams).length ? \`?\${queryString(queryParams)}\` : ''}`);
        expect(patched).not.toContain('queryString(query)');
    });

    it('keeps the props whose types the generator improved', () => {
        const patched = patchRuntimeSource(runtimeSource());

        expect(patched).toContain('method: HttpMethod;');
        expect(patched).toContain('headers?: HttpHeaders;');
        expect(patched).toContain('body?: HttpBody;');
        expect(patched).toContain('const queryString = (params: HttpQuery): string');
    });

    it('is idempotent', () => {
        const once = patchRuntimeSource(runtimeSource());

        expect(patchRuntimeSource(once)).toBe(once);
    });

    it('leaves sources without a RequestOpts interface alone', () => {
        const source = 'export interface Example {\n    reference?: string;\n}\n';

        expect(patchRuntimeSource(source)).toBe(source);
    });
});

describe('patchApiSource', () => {
    it('renames the local query object', () => {
        expect(patchApiSource(apiSource)).toContain('const queryParams: HttpQuery = {};');
    });

    it('renames the assignments for optional parameters', () => {
        const patched = patchApiSource(apiSource);

        expect(patched).toContain("queryParams['itemsPerPage'] = itemsPerPage;");
        expect(patched).toContain("queryParams['pageNumber'] = pageNumber;");
        expect(patched).not.toContain("query['");
    });

    it('renames the prop handed to request()', () => {
        const patched = patchApiSource(apiSource);

        expect(patched).toContain('                queryParams,\n');
        expect(patched).not.toMatch(/^\s*query,$/m);
    });

    it('leaves the word query in documentation alone', () => {
        expect(patchApiSource(apiSource)).toContain('Map of the query parameters supported by the callback method');
    });

    it('is idempotent', () => {
        const once = patchApiSource(apiSource);

        expect(patchApiSource(once)).toBe(once);
    });
});

describe('patchSource', () => {
    it('applies the runtime and api rewrites in one pass', () => {
        expect(patchSource(runtimeSource())).toContain('queryParams?: HttpQuery;');
        expect(patchSource(apiSource)).toContain('const queryParams: HttpQuery = {};');
    });
});

describe('patchTree', () => {
    let root: string;

    beforeEach(() => {
        root = mkdtempSync(path.join(tmpdir(), 'patch-runtime-'));
        mkdirSync(path.join(root, 'apis'), { recursive: true });
        mkdirSync(path.join(root, 'utils'), { recursive: true });
    });

    afterEach(() => {
        rmSync(root, { recursive: true, force: true });
    });

    it('patches the runtime and every api file, and reports how many changed', () => {
        writeFileSync(path.join(root, 'runtime.ts'), runtimeSource());
        writeFileSync(path.join(root, 'apis', 'CertificateInventoryApi.ts'), apiSource);
        writeFileSync(path.join(root, 'index.ts'), "export * from './runtime';\n");

        expect(patchTree(root)).toBe(2);
        expect(readFileSync(path.join(root, 'runtime.ts'), 'utf8')).toContain('queryParams?: HttpQuery;');
        expect(readFileSync(path.join(root, 'apis', 'CertificateInventoryApi.ts'), 'utf8')).toContain('const queryParams: HttpQuery = {};');
        expect(readFileSync(path.join(root, 'index.ts'), 'utf8')).toBe("export * from './runtime';\n");
    });

    it('does not rewrite files that are already patched', () => {
        writeFileSync(path.join(root, 'runtime.ts'), patchRuntimeSource(runtimeSource()));

        expect(patchTree(root)).toBe(0);
    });

    it('reaches the nested utils client', () => {
        writeFileSync(path.join(root, 'runtime.ts'), runtimeSource());
        writeFileSync(path.join(root, 'utils', 'runtime.ts'), runtimeSource(false));

        expect(patchTree(root)).toBe(2);
        expect(readFileSync(path.join(root, 'utils', 'runtime.ts'), 'utf8')).toContain('queryParams?: HttpQuery;');
    });
});

describe('the checked-in generated trees', () => {
    // A regeneration that the hook failed to patch still compiles, because the runtime and the
    // operations would agree on the old name again. These assertions are what makes that visible.
    const openapi = path.resolve(__dirname, '..', 'src', 'types', 'openapi');

    it.each([
        ['core', path.join(openapi, 'runtime.ts')],
        ['utils', path.join(openapi, 'utils', 'runtime.ts')],
    ])('declares queryParams on the %s RequestOpts and no custom query prop', (_client, file) => {
        const source = readFileSync(file, 'utf8');

        expect(source).toContain("export interface RequestOpts extends Omit<AjaxConfig, 'queryParams'> {");
        expect(source).toContain('queryParams?: HttpQuery;');
        expect(source).not.toContain('query?: HttpQuery');
        expect(source).not.toContain('TODO');
    });

    it('has no operation left passing a query prop', () => {
        const offenders = [...walkTypeScriptFiles(openapi)].filter((file: string) => /^[ \t]*query[,[:]/m.test(readFileSync(file, 'utf8')));

        expect(offenders).toEqual([]);
    });
});

describe('run', () => {
    let root: string;

    beforeEach(() => {
        root = mkdtempSync(path.join(tmpdir(), 'patch-runtime-run-'));
        mkdirSync(path.join(root, 'src', 'types', 'openapi', 'utils'), { recursive: true });
    });

    afterEach(() => {
        rmSync(root, { recursive: true, force: true });
        vi.restoreAllMocks();
    });

    // Both clients get the rename, unlike the sibling contact hook: the utils runtime is the same
    // generated file from the same template, so leaving it behind would keep the trap in place there.
    it('patches the core and the utils tree, and logs the count', () => {
        const log = vi.spyOn(console, 'log').mockImplementation(() => {});
        const coreFile = path.join(root, 'src', 'types', 'openapi', 'runtime.ts');
        const utilsFile = path.join(root, 'src', 'types', 'openapi', 'utils', 'runtime.ts');
        writeFileSync(coreFile, runtimeSource());
        writeFileSync(utilsFile, runtimeSource(false));

        expect(run(root)).toBe(2);
        expect(readFileSync(coreFile, 'utf8')).toContain('queryParams?: HttpQuery;');
        expect(readFileSync(utilsFile, 'utf8')).toContain('queryParams?: HttpQuery;');
        expect(readFileSync(utilsFile, 'utf8')).not.toContain('query?: HttpQuery');
        expect(log).toHaveBeenCalledWith('replaced the custom query prop with queryParams in 2 generated file(s)');
    });
});
