import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SchedulerJobExecutionStatus } from 'types/openapi';
import { dateFormatter } from 'utils/dateUtil';
import SchedulerJobHistory from './SchedulerJobHistory';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let mockState: any;

vi.mock('react-redux', () => ({
    useDispatch: () => vi.fn(),
    useSelector: (selector: any) => selector(mockState),
}));

vi.mock('react-router', () => ({
    useNavigate: () => vi.fn(),
}));

vi.mock('components/PagedList/PagedList', () => ({
    default: ({ notice, data }: any) => (
        <>
            <div data-testid="paged-list">{notice}</div>
            {data.map((row: any, i: number) => (
                <div key={i}>{row.columns}</div>
            ))}
        </>
    ),
}));

vi.mock('components/Badge', () => ({
    default: ({ color, children }: any) => (
        <span data-testid="status-badge" data-color={color}>
            {children}
        </span>
    ),
}));

const JOB = 'job-1';

const SKIPPED_AT = '2026-10-05T11:30:00Z';
const SKIPPED_AT_TEXT = `Last skipped at ${dateFormatter(SKIPPED_AT)}`;

const job = (overrides: Record<string, unknown> = {}) => ({
    uuid: JOB,
    lastSkippedAt: SKIPPED_AT,
    lastSkipReason: 'No stale cryptographic asset to re-evaluate',
    ...overrides,
});

describe('SchedulerJobHistory skip notice', () => {
    let container: HTMLDivElement;
    let root: Root;

    const render = async (schedulerJob: Record<string, unknown> | undefined) => {
        mockState = { scheduler: { schedulerJob, schedulerJobHistory: [] }, enums: { platformEnums: {} } };
        await act(async () => {
            root.render(<SchedulerJobHistory uuid={JOB} />);
        });
        return container.querySelector('[data-testid="paged-list"]')?.textContent ?? '';
    };

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(async () => {
        await act(async () => {
            root.unmount();
        });
        container.remove();
    });

    it('states that skipped runs are not kept and shows the last skip with its reason', async () => {
        const text = await render(job());
        expect(text).toContain('Skipped runs are not kept in this history.');
        expect(text).toContain(`${SKIPPED_AT_TEXT}: No stale cryptographic asset to re-evaluate`);
    });

    it('shows the skip time alone when no reason came with it', async () => {
        const text = await render(job({ lastSkipReason: undefined }));
        expect(text.endsWith(SKIPPED_AT_TEXT)).toBe(true);
    });

    it('stays silent while the job has never skipped a run', async () => {
        expect(await render(job({ lastSkippedAt: undefined, lastSkipReason: undefined }))).toBe('');
    });

    it('ignores a detail left over from another job', async () => {
        expect(await render(job({ uuid: 'job-2' }))).toBe('');
    });

    it('stays silent without a loaded detail', async () => {
        expect(await render(undefined)).toBe('');
    });
});

describe('SchedulerJobHistory status badges', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(async () => {
        await act(async () => {
            root.unmount();
        });
        container.remove();
    });

    it('gives a cancelled run a neutral badge, apart from a run still going', async () => {
        const statuses = [SchedulerJobExecutionStatus.Started, SchedulerJobExecutionStatus.Cancelled, SchedulerJobExecutionStatus.Failed];
        mockState = {
            scheduler: { schedulerJob: undefined, schedulerJobHistory: statuses.map((status) => ({ jobUuid: JOB, status })) },
            enums: { platformEnums: {} },
        };
        await act(async () => {
            root.render(<SchedulerJobHistory uuid={JOB} />);
        });

        const badges = Array.from(container.querySelectorAll('[data-testid="status-badge"]'));
        expect(badges.map((badge) => [badge.textContent, badge.getAttribute('data-color')])).toEqual([
            ['started', 'primary'],
            ['cancelled', 'secondary'],
            ['failed', 'danger'],
        ]);
    });
});
