import type { IntegerTunable } from '../tunables';

export type CbomSyncTunableName =
    | 'cbomSyncOverlapSeconds'
    | 'cbomSyncSkippedRetryRuns'
    | 'cbomSyncMaxIngestDocuments'
    | 'cbomSyncSkipRetentionDays';

type CbomSyncTunable = IntegerTunable<CbomSyncTunableName>;

/** The CBOM sync policy values an operator owns; one entry drives both the form field and the read row. */
export const CBOM_SYNC_TUNABLES: readonly CbomSyncTunable[] = [
    {
        name: 'cbomSyncOverlapSeconds',
        label: 'CBOM Sync Overlap',
        unit: 'seconds',
        unitOne: 'second',
        defaultValue: 60,
        min: 0,
        max: 86_400,
        help: 'How far before the start of the last successful sync run each run re-lists the CBOM Repository.',
    },
    {
        name: 'cbomSyncSkippedRetryRuns',
        label: 'CBOM Sync Retries',
        unit: 'runs',
        unitOne: 'run',
        defaultValue: 3,
        min: 0,
        max: 1_000,
        help: 'How many later sync runs retry a document that could not be stored; 0 gives it up at the first failure.',
    },
    {
        name: 'cbomSyncMaxIngestDocuments',
        label: 'CBOM Sync Catch-up',
        unit: 'documents',
        unitOne: 'document',
        defaultValue: 50,
        min: 0,
        max: 10_000,
        help: 'How many CBOMs a run ingests cryptographic assets from beyond the entries it has just stored; 0 turns the catch-up off.',
    },
    {
        name: 'cbomSyncSkipRetentionDays',
        label: 'CBOM Sync Skip Retention',
        unit: 'days',
        unitOne: 'day',
        defaultValue: 90,
        min: 1,
        max: 3_650,
        help: 'How many days a repository entry the sync gave up on stays listed before a scheduled sweep removes its record; an entry still being retried is never swept.',
    },
];
