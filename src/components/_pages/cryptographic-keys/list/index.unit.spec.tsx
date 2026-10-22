import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';

import CryptographicKeyList from './index';
import certificatesReducer, { actions as certificatesActions, initialState as certificatesInitialState } from 'ducks/certificates';
import cryptographicKeysReducer, { actions as keysActions, initialState as keysInitialState } from 'ducks/cryptographic-keys';
import { keyPairMeta } from 'ducks/__fixtures__/token-keys';
import { EntityType } from 'ducks/filters';
import pagingsReducer, { actions as pagingsActions, initialState as pagingsInitialState } from 'ducks/paging';
import tokenProfilesReducer, { actions as tokenProfilesActions, initialState as tokenProfilesInitialState } from 'ducks/token-profiles';
import { InspectedEntryKind, KeyState, KeyType } from 'types/openapi';
import { REMOVE_KEY_FROM_INVENTORY_NOTE, REMOVE_KEYS_FROM_INVENTORY_NOTE } from '../inventoryRemoval';
import { clickByText, clickByTitle } from '../../test-utils/domActions';
import { setupReactActEnvironment } from '../../test-utils/reactActEnvironment';
import { useDispatchMock, useSelectorMock } from '../../test-utils/reactReduxMockModule';

setupReactActEnvironment();

vi.mock('react-redux', async () => {
    return await import('../../test-utils/reactReduxMockModule');
});

vi.mock('components/PagedList/PagedList', () => ({
    default: ({ additionalButtons, refreshToken }: any) => (
        <div data-testid="paged-list" data-refresh-token={refreshToken}>
            {additionalButtons.map((button: any) => (
                <button key={button.tooltip} type="button" title={button.tooltip} onClick={button.onClick} disabled={button.disabled} />
            ))}
        </div>
    ),
}));

vi.mock('components/Dialog', async () => {
    const { dialogMockModule } = await import('../../test-utils/mockModules');
    return dialogMockModule();
});

vi.mock('components/CustomTable', async () => {
    const { customTableMockModule } = await import('../../test-utils/mockModules');
    return customTableMockModule();
});

vi.mock('../form', () => ({ default: () => null }));

describe('CryptographicKeyList', () => {
    let state: any;
    let container: HTMLDivElement;
    let root: Root;

    const renderList = () =>
        act(async () => {
            root.render(<CryptographicKeyList />);
        });
    const listRefreshToken = () => container.querySelector('[data-testid="paged-list"]')?.getAttribute('data-refresh-token');
    const createKeyDialog = () =>
        Array.from(container.querySelectorAll('[data-testid="dialog"]')).find((dialog) => dialog.textContent?.includes('Create Key'));

    beforeEach(() => {
        state = {
            cryptographicKeys: keysInitialState,
            certificates: { ...certificatesInitialState, isImporting: true },
            pagings: { pagings: [] },
            enums: { platformEnums: {} },
            tokenprofiles: tokenProfilesInitialState,
        };
        useDispatchMock.mockReturnValue(vi.fn());
        useSelectorMock.mockImplementation((selector: any) => selector(state));
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    it('refreshes as soon as an import from its Create Key dialog succeeds, however the dialog is then closed', async () => {
        await renderList();
        expect(listRefreshToken()).toBe('0');

        const results = [{ entryReference: 'a'.repeat(64), kind: InspectedEntryKind.PrivateKey, imported: true, keyUuid: 'key-1' }];
        state = {
            ...state,
            certificates: certificatesReducer(state.certificates, certificatesActions.importCertificatesSuccess({ results })),
        };
        await renderList();

        expect(listRefreshToken()).toBe('1');
    });

    it('keeps the Create Key dialog open while an import from it runs', async () => {
        await renderList();
        await clickByTitle(container, 'Create Key');
        expect(createKeyDialog()).toBeDefined();

        await clickByText(container, 'toggle');
        expect(createKeyDialog()).toBeDefined();

        state = { ...state, certificates: { ...state.certificates, isImporting: false } };
        await renderList();
        await clickByText(container, 'toggle');
        expect(createKeyDialog()).toBeUndefined();
    });

    it('refreshes as soon as an onboarding from its Create Key dialog onboards a key, however the dialog is then closed', async () => {
        state = {
            ...state,
            tokenprofiles: tokenProfilesReducer(
                state.tokenprofiles,
                tokenProfilesActions.onboardTokenKeys({
                    tokenInstanceUuid: 'token',
                    tokenProfileUuid: 'profile',
                    keys: [],
                    customAttributes: [],
                }),
            ),
        };
        await renderList();
        expect(listRefreshToken()).toBe('0');

        const results = [
            { keyPairMeta: keyPairMeta('handle'), onboarded: true, intoExistingKey: false, keyUuid: 'key-1', keyName: 'signer' },
        ];
        state = {
            ...state,
            tokenprofiles: tokenProfilesReducer(state.tokenprofiles, tokenProfilesActions.onboardTokenKeysSuccess({ results })),
        };
        await renderList();

        expect(listRefreshToken()).toBe('1');
    });

    it('does not refresh for an onboarding that onboarded no key', async () => {
        state = {
            ...state,
            tokenprofiles: tokenProfilesReducer(
                state.tokenprofiles,
                tokenProfilesActions.onboardTokenKeys({
                    tokenInstanceUuid: 'token',
                    tokenProfileUuid: 'profile',
                    keys: [],
                    customAttributes: [],
                }),
            ),
        };
        await renderList();

        const results = [{ keyPairMeta: keyPairMeta('handle'), onboarded: false, intoExistingKey: false, reason: 'gone' }];
        state = {
            ...state,
            tokenprofiles: tokenProfilesReducer(state.tokenprofiles, tokenProfilesActions.onboardTokenKeysSuccess({ results })),
        };
        await renderList();

        expect(listRefreshToken()).toBe('0');
    });

    it('keeps the Create Key dialog open while an onboarding from it runs', async () => {
        state = {
            ...state,
            certificates: { ...state.certificates, isImporting: false },
            tokenprofiles: { ...state.tokenprofiles, isOnboardingTokenKeys: true },
        };
        await renderList();
        await clickByTitle(container, 'Create Key');

        await clickByText(container, 'toggle');
        expect(createKeyDialog()).toBeDefined();

        state = { ...state, tokenprofiles: { ...state.tokenprofiles, isOnboardingTokenKeys: false } };
        await renderList();
        await clickByText(container, 'toggle');
        expect(createKeyDialog()).toBeUndefined();
    });

    it('does not refresh for an import that was refused', async () => {
        await renderList();

        state = {
            ...state,
            certificates: certificatesReducer(state.certificates, certificatesActions.importCertificatesFailure({ error: 'err' })),
        };
        await renderList();

        expect(listRefreshToken()).toBe('0');
    });
});

describe('CryptographicKeyList removal from the inventory', () => {
    let state: any;
    let dispatch: ReturnType<typeof vi.fn>;
    let container: HTMLDivElement;
    let root: Root;

    const LISTING_PROFILE = 'listing-profile';
    const row = (
        uuid: string,
        keyWrapperUuid: string,
        name: string,
        type: KeyType,
        state = KeyState.Active,
        tokenProfileUuid?: string,
    ) => ({
        uuid,
        keyWrapperUuid,
        name,
        type,
        state,
        tokenProfileUuid,
    });
    const pairPrivate = row('item-1', 'key-1', 'pair', KeyType.Private, KeyState.Active, LISTING_PROFILE);
    const pairPublic = row('item-2', 'key-1', 'pair', KeyType.Public, KeyState.Active, LISTING_PROFILE);
    const otherPairPrivate = row('item-3', 'key-2', 'other pair', KeyType.Private, KeyState.Active, LISTING_PROFILE);
    const compromisedPrivate = row('item-4', 'key-3', 'compromised', KeyType.Private, KeyState.Compromised, LISTING_PROFILE);
    const unlistedPrivate = row('item-5', 'key-4', 'unlisted', KeyType.Private, KeyState.Active, 'other-profile');
    const publicKeyOnly = row('item-6', 'key-5', 'public key only', KeyType.Public);

    const renderList = () =>
        act(async () => {
            root.render(<CryptographicKeyList />);
        });
    const listRefreshToken = () => container.querySelector('[data-testid="paged-list"]')?.getAttribute('data-refresh-token');
    const dialogCaptioned = (caption: string) =>
        Array.from(container.querySelectorAll('[data-testid="dialog"]')).find((dialog) => dialog.textContent?.includes(caption));
    const removeFromInventoryButton = () => container.querySelector('button[title="Remove from inventory"]') as HTMLButtonElement;

    const listWithChecked = (...checked: { uuid: string }[]) => {
        state = {
            ...state,
            pagings: pagingsReducer(
                pagingsInitialState,
                pagingsActions.setCheckedRows({ entity: EntityType.KEY, checkedRows: checked.map((item) => item.uuid) }),
            ),
        };
        return renderList();
    };

    const withKeys = (update: (keys: typeof keysInitialState) => typeof keysInitialState) => {
        state = { ...state, cryptographicKeys: update(state.cryptographicKeys) };
        return renderList();
    };

    const confirmRemovalOfAllChecked = async () => {
        await listWithChecked(pairPrivate, pairPublic, otherPairPrivate, compromisedPrivate);
        await clickByTitle(container, 'Remove from inventory');
        await clickByText(container, 'Remove');
        await withKeys((keys) => cryptographicKeysReducer(keys, keysActions.bulkRemoveKeysFromInventory({ uuids: ['key-1', 'key-2'] })));
    };

    beforeEach(() => {
        state = {
            cryptographicKeys: {
                ...keysInitialState,
                cryptographicKeys: [pairPrivate, pairPublic, otherPairPrivate, compromisedPrivate, unlistedPrivate, publicKeyOnly],
            },
            tokenprofiles: { ...tokenProfilesInitialState, keyListableTokenProfiles: [{ uuid: LISTING_PROFILE }] },
            certificates: certificatesInitialState,
            pagings: pagingsInitialState,
            enums: { platformEnums: {} },
        };
        dispatch = vi.fn();
        useDispatchMock.mockReturnValue(dispatch);
        useSelectorMock.mockImplementation((selector: any) => selector(state));
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    it('asks which token profiles list keys', async () => {
        await renderList();

        expect(dispatch).toHaveBeenCalledWith(tokenProfilesActions.listKeyListableTokenProfiles());
    });

    it('is offered only for a selection holding a key that can leave the inventory', async () => {
        await listWithChecked();
        expect(removeFromInventoryButton().disabled).toBe(true);

        await listWithChecked(compromisedPrivate);
        expect(removeFromInventoryButton().disabled).toBe(true);

        await listWithChecked(unlistedPrivate);
        expect(removeFromInventoryButton().disabled).toBe(true);

        await listWithChecked(publicKeyOnly);
        expect(removeFromInventoryButton().disabled).toBe(true);

        await listWithChecked(compromisedPrivate, otherPairPrivate);
        expect(removeFromInventoryButton().disabled).toBe(false);
    });

    it('is not offered for a key whose private key was destroyed or whose items were destroyed as compromised', async () => {
        const destroyedPrivate = row('item-7', 'key-6', 'destroyed', KeyType.Private, KeyState.Destroyed, LISTING_PROFILE);
        const destroyedCompromisedPublic = row('item-8', 'key-7', 'half', KeyType.Public, KeyState.DestroyedCompromised, LISTING_PROFILE);
        const activePrivateOfHalf = row('item-9', 'key-7', 'half', KeyType.Private, KeyState.Active, LISTING_PROFILE);
        state = {
            ...state,
            cryptographicKeys: {
                ...state.cryptographicKeys,
                cryptographicKeys: [destroyedPrivate, destroyedCompromisedPublic, activePrivateOfHalf],
            },
        };

        await listWithChecked(destroyedPrivate);
        expect(removeFromInventoryButton().disabled).toBe(true);

        await listWithChecked(activePrivateOfHalf);
        expect(removeFromInventoryButton().disabled).toBe(true);
    });

    it('judges a key by all its rows on the page', async () => {
        state = {
            ...state,
            cryptographicKeys: {
                ...state.cryptographicKeys,
                cryptographicKeys: [pairPrivate, { ...pairPublic, state: KeyState.Compromised }],
            },
        };

        await listWithChecked(pairPrivate);

        expect(removeFromInventoryButton().disabled).toBe(true);
    });

    it('counts the keys of a mixed selection, the two items of a key pair once', async () => {
        await listWithChecked(pairPrivate, pairPublic, otherPairPrivate, compromisedPrivate);

        await clickByTitle(container, 'Remove from inventory');

        const dialog = dialogCaptioned('Remove Keys from Inventory');
        expect(dialog?.textContent).toContain(REMOVE_KEYS_FROM_INVENTORY_NOTE);
        expect(dialog?.textContent).toContain('2 keys will be removed.');
        expect(dialog?.textContent).toContain('1 selected key cannot be removed from the inventory and is skipped.');
    });

    it('speaks of a single key in the singular', async () => {
        await listWithChecked(pairPrivate, pairPublic);

        await clickByTitle(container, 'Remove from inventory');

        const dialog = dialogCaptioned('Remove Key from Inventory');
        expect(dialog?.textContent).toContain(REMOVE_KEY_FROM_INVENTORY_NOTE);
        expect(dialog?.textContent).toContain('1 key will be removed.');
        expect(dialog?.textContent).not.toContain('cannot leave');
    });

    it('requests the removal of each removable key of the selection once', async () => {
        await listWithChecked(pairPrivate, pairPublic, otherPairPrivate, compromisedPrivate);

        await clickByTitle(container, 'Remove from inventory');
        await clickByText(container, 'Remove');

        expect(dispatch).toHaveBeenCalledWith(keysActions.bulkRemoveKeysFromInventory({ uuids: ['key-1', 'key-2'] }));
        expect(dialogCaptioned('Remove Keys from Inventory')).toBeUndefined();
    });

    it('relists once every key was removed', async () => {
        await confirmRemovalOfAllChecked();

        await withKeys((keys) => cryptographicKeysReducer(keys, keysActions.bulkRemoveKeysFromInventorySuccess({ messages: [] })));

        expect(listRefreshToken()).toBe('1');
        expect(dialogCaptioned('Removed')).toBeUndefined();
    });

    it('relists and reports each key Core left in the inventory', async () => {
        await confirmRemovalOfAllChecked();

        const skipped = [{ uuid: 'key-2', name: 'other pair', message: 'The key changed' }];
        await withKeys((keys) => cryptographicKeysReducer(keys, keysActions.bulkRemoveKeysFromInventorySuccess({ messages: skipped })));

        expect(listRefreshToken()).toBe('1');
        const report = dialogCaptioned('Removed 1 of 2 keys');
        expect(report?.querySelector('[data-testid="row-key-2"]')?.textContent).toBe('other pairThe key changed');
    });

    it('reports against the whole request when the list mounted while it ran', async () => {
        await withKeys((keys) => cryptographicKeysReducer(keys, keysActions.bulkRemoveKeysFromInventory({ uuids: ['key-1', 'key-2'] })));

        const skipped = [{ uuid: 'key-2', name: 'other pair', message: 'The key changed' }];
        await withKeys((keys) => cryptographicKeysReducer(keys, keysActions.bulkRemoveKeysFromInventorySuccess({ messages: skipped })));

        expect(dialogCaptioned('Removed 1 of 2 keys')).toBeDefined();
    });

    it('keeps the list as it is when the removal is refused', async () => {
        await confirmRemovalOfAllChecked();

        await withKeys((keys) => cryptographicKeysReducer(keys, keysActions.bulkRemoveKeysFromInventoryFailure({ error: 'refused' })));

        expect(listRefreshToken()).toBe('0');
    });
});
