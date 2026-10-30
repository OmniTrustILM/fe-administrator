import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';

import CryptographicKeyList from './index';
import certificatesReducer, { actions as certificatesActions, initialState as certificatesInitialState } from 'ducks/certificates';
import cryptographicKeysReducer, { actions as keysActions, initialState as keysInitialState } from 'ducks/cryptographic-keys';
import { keyPairMeta } from 'ducks/__fixtures__/token-keys';
import { EntityType } from 'ducks/filters';
import pagingsReducer, { actions as pagingsActions, initialState as pagingsInitialState } from 'ducks/paging';
import tokenKeysReducer, { actions as tokenKeysActions, initialState as tokenKeysInitialState } from 'ducks/token-keys';
import { actions as tokenProfilesActions, initialState as tokenProfilesInitialState } from 'ducks/token-profiles';
import { InspectedEntryKind, KeyState, KeyType } from 'types/openapi';
import { REMOVE_KEY_FROM_INVENTORY_NOTE, REMOVE_KEYS_FROM_INVENTORY_NOTE } from '../constants';
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
                <button
                    key={button.tooltip}
                    type="button"
                    title={button.tooltip}
                    data-disabled-tooltip={button.disabledTooltip}
                    onClick={button.onClick}
                    disabled={button.disabled}
                />
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

const createKeyForm = vi.hoisted(() => ({ onWideTabShown: (_wide: boolean) => {} }));

vi.mock('../form', () => ({
    default: ({ onWideTabShown }: { onWideTabShown: (wide: boolean) => void }) => {
        createKeyForm.onWideTabShown = onWideTabShown;
        return null;
    },
}));

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
            tokenKeys: tokenKeysInitialState,
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
            tokenKeys: tokenKeysReducer(
                state.tokenKeys,
                tokenKeysActions.onboardTokenKeys({
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
            tokenKeys: tokenKeysReducer(state.tokenKeys, tokenKeysActions.onboardTokenKeysSuccess({ results })),
        };
        await renderList();

        expect(listRefreshToken()).toBe('1');
    });

    it('does not refresh for an onboarding that onboarded no key', async () => {
        state = {
            ...state,
            tokenKeys: tokenKeysReducer(
                state.tokenKeys,
                tokenKeysActions.onboardTokenKeys({
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
            tokenKeys: tokenKeysReducer(state.tokenKeys, tokenKeysActions.onboardTokenKeysSuccess({ results })),
        };
        await renderList();

        expect(listRefreshToken()).toBe('0');
    });

    it('opens the Create Key dialog at its usual width after it was closed wide', async () => {
        state = { ...state, certificates: { ...state.certificates, isImporting: false } };
        await renderList();
        await clickByTitle(container, 'Create Key');
        await act(async () => createKeyForm.onWideTabShown(true));
        expect(createKeyDialog()?.getAttribute('data-size')).toBe('xxl');

        await clickByText(container, 'toggle');
        await clickByTitle(container, 'Create Key');

        expect(createKeyDialog()?.getAttribute('data-size')).toBe('xl');
    });

    it('keeps the Create Key dialog open while an onboarding from it runs', async () => {
        state = {
            ...state,
            certificates: { ...state.certificates, isImporting: false },
            tokenKeys: { ...state.tokenKeys, isOnboardingTokenKeys: true },
        };
        await renderList();
        await clickByTitle(container, 'Create Key');

        await clickByText(container, 'toggle');
        expect(createKeyDialog()).toBeDefined();

        state = { ...state, tokenKeys: { ...state.tokenKeys, isOnboardingTokenKeys: false } };
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
        removableFromInventory: boolean,
        state = KeyState.Active,
        tokenProfileUuid = LISTING_PROFILE,
    ) => ({
        uuid,
        keyWrapperUuid,
        name,
        type,
        state,
        tokenProfileUuid,
        removableFromInventory,
    });
    const pairPrivate = row('item-1', 'key-1', 'pair', KeyType.Private, true);
    const pairPublic = row('item-2', 'key-1', 'pair', KeyType.Public, true);
    const otherPairPrivate = row('item-3', 'key-2', 'other pair', KeyType.Private, true);
    const compromisedPrivate = row('item-4', 'key-3', 'compromised', KeyType.Private, false, KeyState.Compromised);
    const refusedPrivate = row('item-5', 'key-4', 'refused', KeyType.Private, false);
    const removableUnlistedPrivate = row('item-6', 'key-5', 'removable unlisted', KeyType.Private, true, KeyState.Active, 'other-profile');

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
                cryptographicKeys: [
                    pairPrivate,
                    pairPublic,
                    otherPairPrivate,
                    compromisedPrivate,
                    refusedPrivate,
                    removableUnlistedPrivate,
                ],
            },
            tokenprofiles: { ...tokenProfilesInitialState, keyListableTokenProfiles: [{ uuid: LISTING_PROFILE }] },
            tokenKeys: tokenKeysInitialState,
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

    it('asks for no key-listable token profiles', async () => {
        await renderList();

        expect(dispatch).not.toHaveBeenCalledWith(tokenProfilesActions.listKeyListableTokenProfiles());
    });

    it('is offered only for a selection holding a key Core flags as removable', async () => {
        await listWithChecked();
        expect(removeFromInventoryButton().disabled).toBe(true);

        await listWithChecked(compromisedPrivate, refusedPrivate);
        expect(removeFromInventoryButton().disabled).toBe(true);

        await listWithChecked(compromisedPrivate, otherPairPrivate);
        expect(removeFromInventoryButton().disabled).toBe(false);
    });

    it("follows Core's flag whatever the key's token profile", async () => {
        await listWithChecked(removableUnlistedPrivate);

        expect(removeFromInventoryButton().disabled).toBe(false);
    });

    it('withholds a key whose flag Core cleared although its token lists keys', async () => {
        await listWithChecked(refusedPrivate);

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
        expect(dialog?.textContent).not.toContain('cannot be removed from the inventory');
    });

    it('requests the removal of each removable key of the selection once', async () => {
        await listWithChecked(pairPrivate, pairPublic, otherPairPrivate, compromisedPrivate);

        await clickByTitle(container, 'Remove from inventory');
        await clickByText(container, 'Remove');

        expect(dispatch).toHaveBeenCalledWith(keysActions.bulkRemoveKeysFromInventory({ uuids: ['key-1', 'key-2'] }));
        expect(dialogCaptioned('Remove Keys from Inventory')).toBeUndefined();
    });

    it('is held while a removal runs, without asking for another selection', async () => {
        await confirmRemovalOfAllChecked();

        expect(removeFromInventoryButton().disabled).toBe(true);
        expect(removeFromInventoryButton().dataset.disabledTooltip).toBeUndefined();
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
