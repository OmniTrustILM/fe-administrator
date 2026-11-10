import type { UnknownAction } from '@reduxjs/toolkit';
import { of, Subject, throwError } from 'rxjs';
import { describe, expect, test } from 'vitest';

import { SIGNING_MAX_ITEMS_PER_REQUEST_PATH } from 'utils/platform-settings';
import { actions as appRedirectActions } from './app-redirect';
import { actions } from './settings';
import settingsEpics from './settings-epics';

const UPDATE_PLATFORM_SETTINGS_EPIC_INDEX = 1;

const runUpdateRefusedWith = (refusal: unknown): UnknownAction[] => {
    const action$ = new Subject<UnknownAction>();
    const deps = { apiClients: { settings: { updatePlatformSettings: () => throwError(() => refusal) } } };
    const emitted: UnknownAction[] = [];
    const subscription = settingsEpics[UPDATE_PLATFORM_SETTINGS_EPIC_INDEX](action$, of({}) as any, deps as any).subscribe((action) =>
        emitted.push(action),
    );
    action$.next(actions.updatePlatformSettings({ signing: { maxItemsPerRequest: 1001 } }));
    subscription.unsubscribe();
    return emitted;
};

describe('update platform settings epic', () => {
    test('hands a refused shown field to the form and raises the alert', () => {
        const emitted = runUpdateRefusedWith({ status: 422, response: [`${SIGNING_MAX_ITEMS_PER_REQUEST_PATH} must not exceed 1000`] });

        expect(emitted.map((action) => action.type)).toEqual([
            actions.updatePlatformSettingsFailure.type,
            appRedirectActions.fetchError.type,
        ]);
        expect(emitted[0].payload).toMatchObject({ fieldErrors: { [SIGNING_MAX_ITEMS_PER_REQUEST_PATH]: 'must not exceed 1000' } });
    });

    test('raises the alert for a failure no form shows', () => {
        const emitted = runUpdateRefusedWith({ status: 500, response: { message: 'Internal error' } });

        expect(emitted.map((action) => action.type)).toEqual([
            actions.updatePlatformSettingsFailure.type,
            appRedirectActions.fetchError.type,
        ]);
        expect(emitted[0].payload).toMatchObject({ fieldErrors: undefined });
    });
});
