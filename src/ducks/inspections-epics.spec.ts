import { describe, expect, test } from 'vitest';
import type { UnknownAction } from '@reduxjs/toolkit';
import { firstValueFrom, of, throwError, type Observable } from 'rxjs';
import { AjaxError } from 'rxjs/ajax';
import { take, toArray } from 'rxjs/operators';
import { InspectedEntryKind } from 'types/openapi';

import { actions as inspectionsActions } from './inspections';
import inspectionsEpics from './inspections-epics';

function findEpicIndex(name: string) {
    const index = (inspectionsEpics as { name: string }[]).findIndex((epic) => epic.name === name);
    if (index === -1) throw new Error(`Epic "${name}" not found in inspections-epics`);
    return index;
}

const INSPECT_FILE_EPIC_INDEX = findEpicIndex('inspectFile');

async function runInspectFileEpic(action: UnknownAction, inspect: (args: any) => any, takeCount = 1): Promise<UnknownAction[]> {
    const epics = inspectionsEpics as ((action$: any, state$: any, deps: any) => Observable<UnknownAction>)[];
    const deps = { apiClients: { inspections: { inspect } } };
    const output$ = epics[INSPECT_FILE_EPIC_INDEX](of(action), of({}) as any, deps as any);
    return firstValueFrom(output$.pipe(take(takeCount), toArray()));
}

describe('inspections epics', () => {
    const inspectionRequestDto = { file: 'ZmlsZQ==' };
    const inspectAction = inspectionsActions.inspectFile({ inspectionRequestDto });

    test('inspectFile emits inspectFileSuccess with the response', async () => {
        const inspection = {
            containerDigest: 'digest',
            entries: [{ entryReference: 'a'.repeat(64), kind: InspectedEntryKind.Certificate }],
        };

        const emitted = await runInspectFileEpic(inspectAction, () => of(inspection));

        expect(emitted).toEqual([inspectionsActions.inspectFileSuccess({ inspection })]);
    });

    test('inspectFile failure emits only inspectFileFailure with the extracted message, no fetchError', async () => {
        const emitted = await runInspectFileEpic(inspectAction, () => throwError(() => new Error('boom')));

        expect(emitted).toEqual([inspectionsActions.inspectFileFailure({ error: 'Failed to read the uploaded file. boom' })]);
    });

    test("inspectFile failure carries Core's status with its message", async () => {
        const refusal = new AjaxError('ajax error 403', { status: 403, response: { message: 'Access denied' } } as never, {} as never);

        const emitted = await runInspectFileEpic(inspectAction, () => throwError(() => refusal));

        expect(emitted).toEqual([
            inspectionsActions.inspectFileFailure({ error: 'Failed to read the uploaded file (403): Access denied', status: 403 }),
        ]);
    });
});
