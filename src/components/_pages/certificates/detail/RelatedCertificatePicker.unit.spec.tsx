import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';

import RelatedCertificatePicker from './RelatedCertificatePicker';
import { initialState as certificatesInitialState } from 'ducks/certificates';
import { setupReactActEnvironment } from '../../test-utils/reactActEnvironment';
import { useDispatchMock, useSelectorMock } from '../../test-utils/reactReduxMockModule';

setupReactActEnvironment();

const pagedListProps = vi.hoisted(() => ({ current: undefined as Record<string, unknown> | undefined }));

vi.mock('react-redux', async () => {
    return await import('../../test-utils/reactReduxMockModule');
});

vi.mock('react-router', () => ({
    Link: ({ to, children }: any) => <a href={to}>{children}</a>,
    useNavigate: () => vi.fn(),
}));

vi.mock('components/PagedList/PagedList', () => ({
    default: (props: Record<string, unknown>) => {
        pagedListProps.current = props;
        return <div data-testid="paged-list" />;
    },
}));

vi.mock('components/Dialog', async () => {
    const { dialogMockModule } = await import('../../test-utils/mockModules');
    return dialogMockModule();
});

describe('RelatedCertificatePicker', () => {
    let root: Root;

    beforeEach(() => {
        const state = {
            certificates: certificatesInitialState,
            pagings: { pagings: [] },
            filters: { filters: [] },
            enums: { platformEnums: {} },
            users: { users: [] },
        };
        pagedListProps.current = undefined;
        useDispatchMock.mockReturnValue(vi.fn());
        useSelectorMock.mockImplementation((selector: any) => selector(state));
        const container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    it('lists as a picker with no view strip, which would apply a view filters over the subject-type filter', async () => {
        await act(async () => {
            root.render(<RelatedCertificatePicker onSelect={vi.fn()} />);
        });

        expect(pagedListProps.current).toBeDefined();
        expect(pagedListProps.current?.configurableColumns).toBeUndefined();
        expect(pagedListProps.current?.headers).toBeDefined();
    });
});
