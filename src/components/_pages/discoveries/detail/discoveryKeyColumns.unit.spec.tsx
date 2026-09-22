import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { KeyAlgorithm, KeyFormat, KeyType, Resource } from 'types/openapi';
import { setupReactActEnvironment } from '../../test-utils/reactActEnvironment';
import { KEY_HEADERS, discoveredKey, keyCells, publicKeyPreview } from './discoveryKeyColumns';

setupReactActEnvironment();

vi.mock('components/Button', () => ({
    default: ({ children, onClick, title, 'data-testid': testId }: any) => (
        <button type="button" onClick={onClick} title={title} data-testid={testId}>
            {children}
        </button>
    ),
}));

const enums = {
    type: { [KeyType.Public]: { code: KeyType.Public, label: 'Public key' } },
    algorithm: { [KeyAlgorithm.Rsa]: { code: KeyAlgorithm.Rsa, label: 'RSA' } },
    format: { [KeyFormat.SubjectPublicKeyInfo]: { code: KeyFormat.SubjectPublicKeyInfo, label: 'SPKI' } },
} as any;

const PUBLIC_KEY = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA';

const keyItem = (over: Record<string, unknown> = {}) => ({
    uuid: 'item-1',
    payload: {
        resource: Resource.Keys,
        type: KeyType.Public,
        algorithm: KeyAlgorithm.Rsa,
        length: 2048,
        fingerprint: 'e3b0c44298fc1c14',
        publicKeyFormat: KeyFormat.SubjectPublicKeyInfo,
        publicKey: PUBLIC_KEY,
        ...over,
    },
});

describe('discoveredKey', () => {
    it('recognizes a key payload by the resource that discriminates it', () => {
        expect(discoveredKey(keyItem())?.algorithm).toBe(KeyAlgorithm.Rsa);
    });

    it('has nothing for a certificate payload or for an item whose payload could not be decoded', () => {
        expect(discoveredKey({ payload: { resource: Resource.Certificates, certificateData: 'MII' } as any })).toBeUndefined();
        expect(discoveredKey({ payload: undefined })).toBeUndefined();
    });
});

describe('publicKeyPreview', () => {
    it('shortens a key blob to something a column can hold', () => {
        expect(publicKeyPreview(PUBLIC_KEY)).toBe('MIIBIjANBgkqhkiG…');
    });

    it('leaves a value that already fits alone', () => {
        expect(publicKeyPreview('MIIBIjAN')).toBe('MIIBIjAN');
    });
});

describe('keyCells', () => {
    let container: HTMLDivElement;
    let root: Root;
    const copy = vi.fn();

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        copy.mockReset();
    });

    afterEach(async () => {
        await act(async () => root.unmount());
        container.remove();
    });

    const render = async (item: any) => {
        const cells = keyCells(item, enums, copy);
        expect(cells).toHaveLength(KEY_HEADERS.length);
        await act(async () => root.render(<div>{cells}</div>));
    };

    it('names the type, algorithm and format the way the platform names them', async () => {
        await render(keyItem());

        expect(container.querySelector('[data-testid="key-type"]')?.textContent).toBe('Public key');
        expect(container.querySelector('[data-testid="key-algorithm"]')?.textContent).toBe('RSA');
        expect(container.querySelector('[data-testid="key-format"]')?.textContent).toBe('SPKI');
        expect(container.querySelector('[data-testid="key-length"]')?.textContent).toBe('2048');
        expect(container.querySelector('[data-testid="key-fingerprint"]')?.textContent).toBe('e3b0c44298fc1c14');
    });

    it('copies the whole key, not the preview the column shows', async () => {
        await render(keyItem());

        expect(container.querySelector('[data-testid="key-public"]')?.textContent).toContain('MIIBIjANBgkqhkiG…');
        await act(async () => container.querySelector<HTMLButtonElement>('[data-testid="copy-public-key-item-1"]')?.click());
        expect(copy).toHaveBeenCalledWith(PUBLIC_KEY);
    });

    it('leaves the public key cells empty for a key whose material is never reported', async () => {
        // A PRIVATE_KEY, SECRET_KEY or SPLIT_KEY report omits both by contract: empty here is the contract holding.
        await render(keyItem({ type: KeyType.Private, publicKey: undefined, publicKeyFormat: undefined }));

        expect(container.querySelector('[data-testid="key-type"]')?.textContent).toBe(KeyType.Private);
        expect(container.querySelector('[data-testid="key-format"]')?.textContent).toBe('');
        expect(container.querySelector('[data-testid="key-public"]')?.textContent).toBe('');
        expect(container.querySelector('[data-testid="copy-public-key-item-1"]')).toBeNull();
    });

    it('still fills the row for an item whose payload could not be decoded', async () => {
        await render({ uuid: 'item-1', payload: undefined });

        for (const header of KEY_HEADERS) {
            expect(container.querySelector(`[data-testid="key-${header.id.replace('key', '').toLowerCase()}"]`)?.textContent ?? '').toBe(
                '',
            );
        }
    });
});
