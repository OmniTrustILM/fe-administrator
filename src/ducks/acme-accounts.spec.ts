import { describe, expect, test } from 'vitest';

import reducer, { actions, initialState, selectors } from './acme-accounts';

describe('acmeAccounts slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('resetSate restores initialState', () => {
        const dirty = { ...initialState, isFetchingList: true } as any;
        expect(reducer(dirty, actions.resetSate())).toEqual(initialState);
    });

    test('setCheckedRows', () => {
        const next = reducer(initialState, actions.setCheckedRows({ checkedRows: ['a', 'b'] }));
        expect(next.checkedRows).toEqual(['a', 'b']);
    });

    test('listAcmeAccounts / success / failure', () => {
        let next = reducer(initialState, actions.listAcmeAccounts());
        expect(next.isFetchingList).toBe(true);

        next = reducer(next, actions.listAcmeAccountsSuccess({ acmeAccounts: [{ uuid: '1' } as any] }));
        expect(next.isFetchingList).toBe(false);
        expect(next.accounts).toEqual([{ uuid: '1' }]);

        next = reducer({ ...next, isFetchingList: true }, actions.listAcmeAccountsFailed({ error: 'err' }));
        expect(next.isFetchingList).toBe(false);
    });

    test('getAcmeAccount / success / failure', () => {
        let next = reducer(initialState, actions.getAcmeAccount({ acmeProfileUuid: 'p', uuid: '1' }));
        expect(next.isFetchingDetail).toBe(true);

        next = reducer(next, actions.getAcmeAccountSuccess({ acmeAccount: { uuid: '1' } as any }));
        expect(next.isFetchingDetail).toBe(false);
        expect(next.account).toEqual({ uuid: '1' });

        next = reducer({ ...next, isFetchingDetail: true }, actions.getAcmeAccountFailed({ error: 'err' }));
        expect(next.isFetchingDetail).toBe(false);
    });

    test('revokeAcmeAccount / success / failure', () => {
        const withAccount = {
            ...initialState,
            accounts: [{ uuid: '1', status: 'valid', enabled: true } as any],
            account: { uuid: '1', status: 'valid', enabled: true } as any,
        };

        let next = reducer(withAccount, actions.revokeAcmeAccount({ acmeProfileUuid: 'p', uuid: '1' }));
        expect(next.isRevoking).toBe(true);

        next = reducer(next, actions.revokeAcmeAccountSuccess({ acmeProfileUuid: 'p', uuid: '1' }));
        expect(next.isRevoking).toBe(false);
        expect(next.accounts[0].enabled).toBe(false);
        expect(next.account?.enabled).toBe(false);

        next = reducer({ ...next, isRevoking: true }, actions.revokeAcmeAccountFailed({ error: 'err' }));
        expect(next.isRevoking).toBe(false);
    });

    test('enableAcmeAccount / success / failure', () => {
        const withAccount = {
            ...initialState,
            accounts: [{ uuid: '1', enabled: false } as any],
            account: { uuid: '1', enabled: false } as any,
        };

        let next = reducer(withAccount, actions.enableAcmeAccount({ acmeProfileUuid: 'p', uuid: '1' }));
        expect(next.isEnabling).toBe(true);

        next = reducer(next, actions.enableAcmeAccountSuccess({ uuid: '1' }));
        expect(next.isEnabling).toBe(false);
        expect(next.accounts[0].enabled).toBe(true);
        expect(next.account?.enabled).toBe(true);

        next = reducer({ ...next, isEnabling: true }, actions.enableAcmeAccountFailed({ error: 'err' }));
        expect(next.isEnabling).toBe(false);
    });

    test('disableAcmeAccount / success / failure', () => {
        const withAccount = {
            ...initialState,
            accounts: [{ uuid: '1', enabled: true } as any],
            account: { uuid: '1', enabled: true } as any,
        };

        let next = reducer(withAccount, actions.disableAcmeAccount({ acmeProfileUuid: 'p', uuid: '1' }));
        expect(next.isDisabling).toBe(true);

        next = reducer(next, actions.disableAcmeAccountSuccess({ uuid: '1' }));
        expect(next.isDisabling).toBe(false);
        expect(next.accounts[0].enabled).toBe(false);
        expect(next.account?.enabled).toBe(false);

        next = reducer({ ...next, isFetchingDetail: true }, actions.disableAcmeAccountFailed({ error: 'err' }));
        expect(next.isFetchingDetail).toBe(false);
    });

    test('bulkRevokeAcmeAccounts / success / failure', () => {
        const withAccounts = {
            ...initialState,
            accounts: [{ uuid: '1', status: 'valid', enabled: true } as any, { uuid: '2', status: 'valid', enabled: true } as any],
            account: { uuid: '1', status: 'valid', enabled: true } as any,
        };

        let next = reducer(withAccounts, actions.bulkRevokeAcmeAccounts({ uuids: ['1', '2'] }));
        expect(next.isBulkRevoking).toBe(true);

        next = reducer(next, actions.bulkRevokeAcmeAccountsSuccess({ uuids: ['1', '2'] }));
        expect(next.isBulkRevoking).toBe(false);
        expect(next.accounts[0].enabled).toBe(false);
        expect(next.accounts[1].enabled).toBe(false);
        expect(next.account?.enabled).toBe(false);

        next = reducer({ ...next, isBulkRevoking: true }, actions.bulkRevokeAcmeAccountsFailed({ error: 'err' }));
        expect(next.isBulkRevoking).toBe(false);
    });

    test('bulkEnableAcmeAccounts / success / failure', () => {
        const withAccounts = {
            ...initialState,
            accounts: [{ uuid: '1', enabled: false } as any],
            account: { uuid: '1', enabled: false } as any,
        };

        let next = reducer(withAccounts, actions.bulkEnableAcmeAccounts({ uuids: ['1'] }));
        expect(next.isBulkEnabling).toBe(true);

        next = reducer(next, actions.bulkEnableAcmeAccountsSuccess({ uuids: ['1'] }));
        expect(next.isBulkEnabling).toBe(false);
        expect(next.accounts[0].enabled).toBe(true);
        expect(next.account?.enabled).toBe(true);

        next = reducer({ ...next, isBulkEnabling: true }, actions.bulkEnableAcmeAccountsFailed({ error: 'err' }));
        expect(next.isBulkEnabling).toBe(false);
    });

    test('bulkDisableAcmeAccounts / success / failure', () => {
        const withAccounts = {
            ...initialState,
            accounts: [{ uuid: '1', enabled: true } as any],
            account: { uuid: '1', enabled: true } as any,
        };

        let next = reducer(withAccounts, actions.bulkDisableAcmeAccounts({ uuids: ['1'] }));
        expect(next.isBulkDisabling).toBe(true);

        next = reducer(next, actions.bulkDisableAcmeAccountsSuccess({ uuids: ['1'] }));
        expect(next.isBulkDisabling).toBe(false);
        expect(next.accounts[0].enabled).toBe(false);
        expect(next.account?.enabled).toBe(false);

        next = reducer({ ...next, isBulkDisabling: true }, actions.bulkDisableAcmeAccountsFailed({ error: 'err' }));
        expect(next.isBulkDisabling).toBe(false);
    });
});

describe('acmeAccounts selectors', () => {
    test('selectors read from state', () => {
        const featureState: any = {
            ...initialState,
            checkedRows: ['r1'],
            account: { uuid: '1' },
            accounts: [{ uuid: '1' }],
            isFetchingList: true,
            isFetchingDetail: true,
            isRevoking: true,
            isBulkRevoking: true,
            isEnabling: true,
            isBulkEnabling: true,
            isDisabling: true,
            isBulkDisabling: true,
        };
        const state = { acmeAccounts: featureState } as any;

        expect(selectors.checkedRows(state)).toEqual(['r1']);
        expect(selectors.account(state)).toEqual({ uuid: '1' });
        expect(selectors.accounts(state)).toEqual([{ uuid: '1' }]);
        expect(selectors.isFetchingList(state)).toBe(true);
        expect(selectors.isFetchingDetail(state)).toBe(true);
        expect(selectors.isRevoking(state)).toBe(true);
        expect(selectors.isBulkRevoking(state)).toBe(true);
        expect(selectors.isEnabling(state)).toBe(true);
        expect(selectors.isBulkEnabling(state)).toBe(true);
        expect(selectors.isDisabling(state)).toBe(true);
        expect(selectors.isBulkDisabling(state)).toBe(true);
    });
});
