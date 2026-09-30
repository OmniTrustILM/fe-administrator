import { from, type Observable, of } from 'rxjs';
import { catchError, concatMap, map, toArray } from 'rxjs/operators';

import { extractErrorReason } from 'utils/net';

type DeleteOutcome = { uuid: string; ok: true } | { uuid: string; ok: false; reason: string | undefined };

export type BulkDeleteResults = {
    deletedUuids: string[];
    failures: Extract<DeleteOutcome, { ok: false }>[];
};

export function deleteSequentially(uuids: string[], deleteOne: (uuid: string) => Observable<unknown>): Observable<BulkDeleteResults> {
    return from(uuids).pipe(
        concatMap((uuid) =>
            deleteOne(uuid).pipe(
                map((): DeleteOutcome => ({ uuid, ok: true })),
                catchError((err) => of<DeleteOutcome>({ uuid, ok: false, reason: extractErrorReason(err) })),
            ),
        ),
        toArray(),
        map((results) => ({
            deletedUuids: results.filter((r) => r.ok).map((r) => r.uuid),
            failures: results.filter((r) => !r.ok),
        })),
    );
}

export function bulkDeleteFailureMessage(
    failures: BulkDeleteResults['failures'],
    noun: string,
    items: { uuid: string; name: string }[],
): string {
    const names = new Map(items.map((item) => [item.uuid, item.name]));
    const headline = `Failed to delete ${failures.length} ${noun}${failures.length === 1 ? '' : 's'}`;
    const details = failures.map(({ uuid, reason }) => {
        const name = names.get(uuid) ?? uuid;
        return reason ? `${name}: ${reason}` : name;
    });
    return [headline, ...details].join('\n');
}
