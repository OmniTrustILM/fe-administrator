export type CbomSyncTunableName = 'cbomSyncOverlapSeconds' | 'cbomSyncSkippedRetryRuns' | 'cbomSyncMaxIngestDocuments';

export type CbomSyncTunable = Readonly<{
    name: CbomSyncTunableName;
    label: string;
    unit: string;
    unitOne: string;
    /**
     * What the platform uses, and reports back, while the value is unset: the schema's `default`. Transcribed from the
     * published core spec (`components.schemas.UtilsSettingsDto`), as `max` is: the type generator emits neither
     * defaults nor bounds into the type, so a change there has to be carried here by hand.
     */
    defaultValue: number;
    /**
     * The schema's `maximum`, refused here before the value is sent; its `minimum` of 0 is what the whole-number
     * validator enforces.
     */
    max: number;
    help: string;
}>;

/** The three CBOM sync policy values an operator owns; one entry drives both the form field and the read row. */
export const CBOM_SYNC_TUNABLES: readonly CbomSyncTunable[] = [
    {
        name: 'cbomSyncOverlapSeconds',
        label: 'CBOM Sync Overlap',
        unit: 'seconds',
        unitOne: 'second',
        defaultValue: 60,
        max: 86_400,
        help: 'How far before the start of the last successful sync run each run re-lists the CBOM Repository.',
    },
    {
        name: 'cbomSyncSkippedRetryRuns',
        label: 'CBOM Sync Retries',
        unit: 'runs',
        unitOne: 'run',
        defaultValue: 3,
        max: 1_000,
        help: 'How many later sync runs retry a document that could not be stored; 0 gives it up at the first failure.',
    },
    {
        name: 'cbomSyncMaxIngestDocuments',
        label: 'CBOM Sync Catch-up',
        unit: 'documents',
        unitOne: 'document',
        defaultValue: 50,
        max: 10_000,
        help: 'How many CBOMs a run ingests cryptographic assets from beyond the entries it has just stored; 0 turns the catch-up off.',
    },
];

/** The form keeps numbers as text; empty means "not set", which the platform reads as its default. */
export const integerText = (value?: number): string => (value == null ? '' : String(value));

export const parseOptionalInteger = (value?: string): number | undefined =>
    value === undefined || value === '' ? undefined : Number.parseInt(value, 10);

/** What the read view shows: the value with its unit, or the platform default while nothing is set. */
export const describeTunable = (tunable: CbomSyncTunable, value: number | undefined): string =>
    value == null
        ? `platform default (${tunable.defaultValue} ${tunable.unit})`
        : `${value} ${value === 1 ? tunable.unitOne : tunable.unit}`;
