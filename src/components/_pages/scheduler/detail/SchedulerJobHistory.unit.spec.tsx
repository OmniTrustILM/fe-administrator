import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
    default: ({ notice }: any) => <div data-testid="paged-list">{notice}</div>,
}));

const JOB = 'job-1';

const job = (overrides: Record<string, unknown> = {}) => ({
    uuid: JOB,
    lastSkippedAt: '2026-10-05T11:30:00Z',
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
        expect(text).toContain('Last skipped at 2026-10-05');
        expect(text).toContain(': No stale cryptographic asset to re-evaluate');
    });

    it('shows the skip time alone when no reason came with it', async () => {
        const text = await render(job({ lastSkipReason: undefined }));
        expect(text).toMatch(/Last skipped at 2026-10-05 \d\d:\d\d:\d\d$/);
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
