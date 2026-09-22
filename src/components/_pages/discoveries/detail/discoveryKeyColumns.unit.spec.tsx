import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { KeyAlgorithm, KeyFormat, KeyType, Resource } from 'types/openapi';
import { setupReactActEnvironment } from '../../test-utils/reactActEnvironment';
import { KEY_HEADERS, PublicKeyDetails, discoveredKey, keyCells, publicKeyCell } from './discoveryKeyColumns';

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

describe('keyCells', () => {
    let container: HTMLDivElement;
    let root: Root;
    const show = vi.fn();

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        show.mockReset();
    });

    afterEach(async () => {
        await act(async () => root.unmount());
        container.remove();
    });

    const render = async (item: any) => {
        const cells = keyCells(item, enums, show);
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

    it('leaves the public key cells empty for a key whose material is never reported', async () => {
        // A PRIVATE_KEY, SECRET_KEY or SPLIT_KEY report omits both by contract: empty here is the contract holding.
        await render(keyItem({ type: KeyType.Private, publicKey: undefined, publicKeyFormat: undefined }));

        expect(container.querySelector('[data-testid="key-type"]')?.textContent).toBe(KeyType.Private);
        expect(container.querySelector('[data-testid="key-format"]')?.textContent).toBe('');
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

describe('publicKeyCell', () => {
    let container: HTMLDivElement;
    let root: Root;
    const show = vi.fn();

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        show.mockReset();
    });

    afterEach(async () => {
        await act(async () => root.unmount());
        container.remove();
    });

    it('offers the key for reading rather than showing a fragment of it in a column', async () => {
        // Half a base64 blob is unreadable either way, so the column holds an action and the value lives in a
        // dialog - the same shape the platform uses for a secret's content.
        await act(async () => root.render(<div>{publicKeyCell(keyItem() as any, show)}</div>));

        await act(async () => container.querySelector<HTMLButtonElement>('[data-testid="show-public-key-item-1"]')?.click());

        expect(show).toHaveBeenCalledWith(expect.objectContaining({ publicKey: PUBLIC_KEY }));
    });

    it('has no action for a key whose material is never reported', async () => {
        const noMaterial = keyItem({ type: KeyType.Private, publicKey: undefined, publicKeyFormat: undefined });
        await act(async () => root.render(<div>{publicKeyCell(noMaterial as any, show)}</div>));

        expect(container.querySelector('[data-testid="show-public-key-item-1"]')).toBeNull();
    });
});

describe('PublicKeyDetails', () => {
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

    it('shows the whole key with the format it is encoded in, and copies it unabridged', async () => {
        await act(async () => root.render(<PublicKeyDetails discoveredKey={keyItem().payload as any} enums={enums} onCopy={copy} />));

        expect(container.querySelector('[data-testid="public-key-format"]')?.textContent).toBe('SPKI');
        expect(container.querySelector('[data-testid="public-key-value"]')?.textContent).toBe(PUBLIC_KEY);

        await act(async () => container.querySelector<HTMLButtonElement>('[data-testid="copy-public-key"]')?.click());
        expect(copy).toHaveBeenCalledWith(PUBLIC_KEY);
    });
});
