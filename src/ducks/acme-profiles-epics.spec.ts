import type { UnknownAction } from '@reduxjs/toolkit';
import { firstValueFrom, of, throwError } from 'rxjs';
import { AjaxError } from 'rxjs/ajax';
import { take, toArray } from 'rxjs/operators';
import { assert, describe, expect, test } from 'vitest';
import { extractError } from 'utils/net';

import { actions } from './acme-profiles';
import { actions as appRedirectActions } from './app-redirect';

// The body core's ExceptionHandlingAdvice sends when the operator may not read a chosen EAB secret.
const secretContentDenied = () =>
    new AjaxError(
        'forbidden',
        {
            status: 403,
            response: {
                statusCode: 403,
                code: 'ACCESS_DENIED',
                message: "Access Denied. Required 'Get Secret Content' permission for 'Secret'",
            },
        } as never,
        {} as never,
    );

async function run(epicName: string, action: UnknownAction, client: Record<string, unknown>): Promise<UnknownAction[]> {
    const { default: epics } = await import('./acme-profiles-epics');
    const epic = epics.find((candidate) => candidate.name === epicName);
    if (!epic) throw new Error(`Epic "${epicName}" not found`);
    const output$ = epic(of(action), of({}) as never, { apiClients: { acmeProfiles: client } } as never);
    return firstValueFrom(output$.pipe(take(3), toArray()));
}

const request = { name: 'p', issueCertificateAttributes: [], revokeCertificateAttributes: [], eabSecretUuids: ['s-1'] } as never;

describe('acme-profiles epics: an EAB secret the operator may not read', () => {
    test.each([
        ['createAcmeProfile', actions.createAcmeProfile(request), 'createAcmeProfile', 'Failed to create ACME Profile'],
        [
            'updateAcmeProfile',
            actions.updateAcmeProfile({ uuid: 'p-1', updateAcmeRequest: request }),
            'editAcmeProfile',
            'Failed to update ACME Profile',
        ],
    ])('%s surfaces the permission the server names', async (epicName, action, clientMethod, headline) => {
        const emitted = await run(epicName, action, { [clientMethod]: () => throwError(secretContentDenied) });

        const [failure, toast] = emitted;
        expect(failure).toMatchObject({
            payload: { error: `${headline} (403): Access Denied. Required 'Get Secret Content' permission for 'Secret'` },
        });

        assert(appRedirectActions.fetchError.match(toast));
        expect(extractError(toast.payload.error as Error, toast.payload.message)).toContain(
            "Required 'Get Secret Content' permission for 'Secret'",
        );
    });
});
