import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { firstValueFrom, of, throwError, type Observable } from 'rxjs';
import { AjaxError } from 'rxjs/ajax';
import { take, toArray } from 'rxjs/operators';
import type { AppState, EpicDependencies } from './index';
import * as slice from './login';
import loginEpics from './login-epics';

describe('login epics', () => {
    const originalLocation = globalThis.location;

    beforeEach(() => {
        delete (globalThis as any).location;
        globalThis.location = { ...originalLocation, assign: vi.fn(), origin: 'http://localhost' };
    });

    afterEach(() => {
        globalThis.location = originalLocation;
        vi.unstubAllGlobals();
    });

    const createLoginMethodsDeps = (mockReturnValue: Observable<any>): EpicDependencies =>
        ({
            apiClients: {
                login: {
                    getOAuth2Providers: vi.fn().mockReturnValue(mockReturnValue),
                },
            },
        }) as unknown as EpicDependencies;

    const executeLoginEpic = async (loginMethods: any, redirect?: string) => {
        const action$ = of(slice.actions.getLoginMethods(redirect ? { redirect } : {}));
        const state$ = of({} as AppState);
        const deps = createLoginMethodsDeps(of(loginMethods));

        const output$ = loginEpics[0](action$, state$, deps);
        return { output$, deps };
    };

    test('getLoginMethods success with multiple methods emits getLoginMethodsSuccess', async () => {
        const loginMethods = [
            { name: 'Method 1', loginUrl: 'http://localhost/login1' },
            { name: 'Method 2', loginUrl: 'http://localhost/login2' },
        ];

        const { output$, deps } = await executeLoginEpic(loginMethods, 'dashboard');
        const emitted = await firstValueFrom(output$.pipe(take(1), toArray()));

        expect(emitted).toEqual([slice.actions.getLoginMethodsSuccess({ loginMethods })]);
        expect(deps.apiClients.login.getOAuth2Providers).toHaveBeenCalledWith({});
    });

    test('getLoginMethods success with single method redirects', async () => {
        const loginMethods = [{ name: 'Method 1', loginUrl: 'http://localhost/login1' }];

        const { output$ } = await executeLoginEpic(loginMethods, 'dashboard');

        // When there is a redirect, it returns EMPTY, so we use toArray and expect empty
        const emitted = await firstValueFrom(output$.pipe(toArray()));

        expect(emitted).toEqual([]);
        expect(globalThis.location.assign).toHaveBeenCalledWith('http://localhost/login1?redirect=dashboard');
    });

    test('getLoginMethods with absolute loginUrl redirects correctly', async () => {
        const loginMethods = [{ name: 'Method 1', loginUrl: 'https://other-domain.com/login' }];

        const { output$ } = await executeLoginEpic(loginMethods, 'home');

        await firstValueFrom(output$.pipe(toArray()));

        expect(globalThis.location.assign).toHaveBeenCalledWith('https://other-domain.com/login?redirect=home');
    });

    test('getLoginMethods failure emits getLoginMethodsFailure', async () => {
        const errorObj = Object.assign(new Error('Not Found'), {
            name: 'AjaxError' as const,
            status: 404,
            response: { message: 'Not Found' },
            responseType: 'json',
            request: {},
            xhr: { status: 404, responseType: 'json', responseText: '{}', response: { message: 'Not Found' } },
        });
        Object.setPrototypeOf(errorObj, AjaxError.prototype);
        const error = errorObj as unknown as AjaxError;
        const action$ = of(slice.actions.getLoginMethods({}));
        const state$ = of({} as AppState);
        const deps = createLoginMethodsDeps(throwError(() => error));

        const output$ = loginEpics[0](action$, state$, deps);
        const emitted = await firstValueFrom(output$.pipe(take(1), toArray()));

        expect(emitted).toEqual([slice.actions.getLoginMethodsFailure({ error: 'Failed to load login methods (404): Not Found' })]);
    });

    test('getLoginMethods catch network error emits getLoginMethodsFailure', async () => {
        const error = new Error('Network failure');
        const action$ = of(slice.actions.getLoginMethods({}));
        const state$ = of({} as AppState);
        const deps = createLoginMethodsDeps(throwError(() => error));

        const output$ = loginEpics[0](action$, state$, deps);
        const emitted = await firstValueFrom(output$.pipe(take(1), toArray()));

        expect(emitted).toEqual([slice.actions.getLoginMethodsFailure({ error: 'Failed to load login methods. Network failure' })]);
    });
});
