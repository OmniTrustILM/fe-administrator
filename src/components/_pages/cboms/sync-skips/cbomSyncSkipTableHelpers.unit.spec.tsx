import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { getEnumLabel } from 'ducks/enums';
import { type CbomSyncSkipDto, CbomSyncSkipState } from 'types/openapi';
import { buildCbomSyncSkipRows, CBOM_SYNC_SKIP_HEADERS } from './cbomSyncSkipTableHelpers';

const writtenOff: CbomSyncSkipDto = {
    uuid: 'skip-1',
    serialNumber: 'urn:uuid:written-off',
    version: 2,
    state: CbomSyncSkipState.PermanentlySkipped,
    attempts: 4,
    firstSkippedAt: '2026-09-01T12:00:00Z',
    lastAttemptAt: '2026-09-04T12:00:00Z',
    reason: 'The CBOM Repository answered 404 for the document',
    algorithms: 0,
    certificates: 0,
    protocols: 0,
    cryptoMaterial: 0,
    totalAssets: 0,
};
const retrying: CbomSyncSkipDto = {
    ...writtenOff,
    uuid: 'skip-2',
    serialNumber: 'urn:uuid:second',
    state: CbomSyncSkipState.Retrying,
    attempts: 1,
};

/** The real label lookup, so a state the platform enum does not carry falls back exactly as it does on the page. */
const opts = {
    stateEnum: { permanentlySkipped: { code: 'permanentlySkipped', label: 'Permanently skipped' } } as any,
    getEnumLabel,
    dateFormatter: (date: string | Date) => `formatted ${date}`,
    onRetry: () => undefined,
};

/** `disabled` as an attribute on the button, not the `disabled:` utility classes every button carries. */
const DISABLED_BUTTON = /<button[^>]*\sdisabled(=""|\s|>)/;

describe('cbom sync skip rows', () => {
    it('renders one row per skip with every header filled', () => {
        const rows = buildCbomSyncSkipRows([writtenOff, retrying], opts);

        expect(rows.map((row) => row.id)).toEqual(['skip-1', 'skip-2']);
        expect(rows[0].columns).toHaveLength(CBOM_SYNC_SKIP_HEADERS.length);
        const markup = renderToStaticMarkup(<>{rows[0].columns}</>);
        expect(markup).toContain('urn:uuid:written-off');
        expect(markup).toContain('Permanently skipped');
        expect(markup).toContain('formatted 2026-09-04T12:00:00Z');
        expect(markup).toContain('The CBOM Repository answered 404 for the document');
    });

    it('offers a retry only for a written-off row, and falls back to the raw state without an enum', () => {
        const rows = buildCbomSyncSkipRows([writtenOff, retrying], { ...opts, stateEnum: undefined });

        expect(renderToStaticMarkup(<>{rows[0].columns}</>)).toContain('retry-skip-1');
        // The control carries an icon and no text, so the name has to be spelled out.
        expect(renderToStaticMarkup(<>{rows[0].columns}</>)).toContain('aria-label="Retry skipped document"');
        expect(renderToStaticMarkup(<>{rows[1].columns}</>)).not.toContain('retry-');
        // Neither serial number carries a state word, so these can only come from the state cell.
        expect(renderToStaticMarkup(<>{rows[1].columns}</>)).toContain('retrying');
        expect(renderToStaticMarkup(<>{rows[0].columns}</>)).toContain('permanentlySkipped');
    });

    it('disables every retry button while one retry is in flight, and none while there is none', () => {
        const idle = buildCbomSyncSkipRows([writtenOff], opts);
        expect(renderToStaticMarkup(<>{idle[0].columns}</>)).not.toMatch(DISABLED_BUTTON);

        const busy = buildCbomSyncSkipRows([writtenOff], { ...opts, retryingUuid: 'skip-9' });
        expect(renderToStaticMarkup(<>{busy[0].columns}</>)).toMatch(DISABLED_BUTTON);
    });

    it('leaves a timestamp cell empty rather than rendering a broken date', () => {
        const rows = buildCbomSyncSkipRows([{ ...writtenOff, lastAttemptAt: undefined as never }], opts);

        expect(renderToStaticMarkup(<>{rows[0].columns}</>)).not.toContain('NaN');
    });
});
