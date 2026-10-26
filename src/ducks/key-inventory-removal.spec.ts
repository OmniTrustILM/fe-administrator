import { firstValueFrom, of, throwError } from 'rxjs';
import { toArray } from 'rxjs/operators';
import { describe, expect, test, vi } from 'vitest';
import { actions as alertActions } from './alerts';
import { actions as appRedirectActions } from './app-redirect';
import cryptographicKeysReducer, { actions as keyActions, initialState as keyInitialState } from './cryptographic-keys';
import cryptographicKeyEpics from './cryptographic-keys-epics';

vi.mock('../App', () => ({ store: { dispatch: vi.fn() } }));

function epicNamed(epics: unknown[], name: string) {
    const epic = (epics as { name: string }[]).find((candidate) => candidate.name === name);
    if (!epic) throw new Error(`Epic "${name}" not found`);
    return epic as unknown as (action$: unknown, state$: unknown, deps: unknown) => ReturnType<typeof of>;
}

describe('removing a key from the inventory', () => {
    test('is in progress until it succeeds or fails', () => {
        // given
        const removing = cryptographicKeysReducer(keyInitialState, keyActions.removeKeyFromInventory({ uuid: 'key-1', redirect: '/keys' }));

        // when
        const removed = cryptographicKeysReducer(removing, keyActions.removeKeyFromInventorySuccess({ uuid: 'key-1' }));
        const failed = cryptographicKeysReducer(removing, keyActions.removeKeyFromInventoryFailure({ error: 'refused' }));

        // then
        expect(removing.isRemovingFromInventory).toBe(true);
        expect(removed.isRemovingFromInventory).toBe(false);
        expect(failed.isRemovingFromInventory).toBe(false);
    });

    test('drops the items of the removed key from the list, and the key from the detail', () => {
        // given
        const privateItem = { uuid: 'item-1', keyWrapperUuid: 'key-1', name: 'signer' };
        const publicItem = { uuid: 'item-2', keyWrapperUuid: 'key-1', name: 'signer' };
        const otherItem = { uuid: 'item-3', keyWrapperUuid: 'key-2', name: 'other' };
        const shown = {
            ...keyInitialState,
            cryptographicKeys: [privateItem, publicItem, otherItem],
            cryptographicKey: { uuid: 'key-1', name: 'signer' },
        } as never;

        // when
        const removed = cryptographicKeysReducer(shown, keyActions.removeKeyFromInventorySuccess({ uuid: 'key-1' }));

        // then
        expect(removed.cryptographicKeys).toEqual([otherItem]);
        expect(removed.cryptographicKey).toBeUndefined();
    });

    test('redirects once Core removed the key', async () => {
        // given
        const removeKeyFromInventory = vi.fn(() => of(undefined));
        const action = keyActions.removeKeyFromInventory({ uuid: 'key-1', redirect: '/keys' });

        // when
        const emitted = await firstValueFrom(
            epicNamed(cryptographicKeyEpics, 'removeKeyFromInventory')(of(action), of({}), {
                apiClients: { cryptographicKeys: { removeKeyFromInventory } },
            }).pipe(toArray()),
        );

        // then
        expect(removeKeyFromInventory).toHaveBeenCalledWith({ uuid: 'key-1' });
        expect(emitted).toEqual([
            keyActions.removeKeyFromInventorySuccess({ uuid: 'key-1' }),
            appRedirectActions.redirect({ url: '/keys' }),
        ]);
    });

    test('reports a refused removal', async () => {
        // given
        const refusal = new Error('refused');
        const action = keyActions.removeKeyFromInventory({ uuid: 'key-1', redirect: '/keys' });

        // when
        const emitted = await firstValueFrom(
            epicNamed(cryptographicKeyEpics, 'removeKeyFromInventory')(of(action), of({}), {
                apiClients: { cryptographicKeys: { removeKeyFromInventory: () => throwError(() => refusal) } },
            }).pipe(toArray()),
        );

        // then
        expect(emitted).toEqual([
            keyActions.removeKeyFromInventoryFailure({ error: 'Failed to remove the key from the inventory. refused' }),
            appRedirectActions.fetchError({ error: refusal, message: 'Failed to remove the key from the inventory' }),
        ]);
    });
});

describe('removing keys from the inventory in bulk', () => {
    const skipped = [{ uuid: 'key-2', name: 'compromised', message: 'It is compromised and would come back active when onboarded again.' }];

    function removeKeysFromInventoryWith(removeKeysFromInventory: (request: unknown) => unknown) {
        const action = keyActions.bulkRemoveKeysFromInventory({ uuids: ['key-1', 'key-2'] });
        return firstValueFrom(
            epicNamed(cryptographicKeyEpics, 'bulkRemoveKeysFromInventory')(of(action), of({}), {
                apiClients: { cryptographicKeys: { removeKeysFromInventory } },
            }).pipe(toArray()),
        );
    }

    test('is in progress until it succeeds or fails, and keeps the report of a success only', () => {
        // given
        const reported = { ...keyInitialState, bulkRemoveFromInventoryFailures: skipped };

        // when
        const removing = cryptographicKeysReducer(reported, keyActions.bulkRemoveKeysFromInventory({ uuids: ['key-1', 'key-2'] }));
        const removed = cryptographicKeysReducer(removing, keyActions.bulkRemoveKeysFromInventorySuccess({ messages: skipped }));
        const failed = cryptographicKeysReducer(removing, keyActions.bulkRemoveKeysFromInventoryFailure({ error: 'refused' }));

        // then
        expect(removing.isBulkRemovingFromInventory).toBe(true);
        expect(removing.bulkRemoveFromInventoryRequestSize).toBe(2);
        expect(removing.bulkRemoveFromInventoryFailures).toBeUndefined();
        expect(removed.isBulkRemovingFromInventory).toBe(false);
        expect(removed.bulkRemoveFromInventoryFailures).toEqual(skipped);
        expect(failed.isBulkRemovingFromInventory).toBe(false);
        expect(failed.bulkRemoveFromInventoryFailures).toBeUndefined();
    });

    test('sends the keys to Core and confirms a removal that skipped none', async () => {
        // given
        const removeKeysFromInventory = vi.fn(() => of([]));

        // when
        const emitted = await removeKeysFromInventoryWith(removeKeysFromInventory);

        // then
        expect(removeKeysFromInventory).toHaveBeenCalledWith({ requestBody: ['key-1', 'key-2'] });
        expect(emitted).toEqual([
            keyActions.bulkRemoveKeysFromInventorySuccess({ messages: [] }),
            alertActions.success('2 keys removed from the inventory.'),
        ]);
    });

    test('hands on the keys Core skipped, without a confirmation', async () => {
        // when
        const emitted = await removeKeysFromInventoryWith(() => of(skipped));

        // then
        expect(emitted).toEqual([keyActions.bulkRemoveKeysFromInventorySuccess({ messages: skipped })]);
    });

    test('reports a refused removal', async () => {
        // given
        const refusal = new Error('refused');

        // when
        const emitted = await removeKeysFromInventoryWith(() => throwError(() => refusal));

        // then
        expect(emitted).toEqual([
            keyActions.bulkRemoveKeysFromInventoryFailure({ error: 'Failed to remove keys from the inventory. refused' }),
            appRedirectActions.fetchError({ error: refusal, message: 'Failed to remove keys from the inventory' }),
        ]);
    });
});
