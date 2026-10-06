import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';

import RelatedCertificatePicker from './RelatedCertificatePicker';
import { initialState as certificatesInitialState } from 'ducks/certificates';
import { EntityType } from 'ducks/filters';
import pagingReducer, { actions as pagingActions } from 'ducks/paging';
import type { CertificateListResponseModel } from 'types/certificate';
import { CertificateState } from 'types/openapi';
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

const listed = (uuid: string) =>
    ({ uuid, state: CertificateState.Issued, notBefore: '2026-05-28T09:36:22.000+00:00' }) as CertificateListResponseModel;

describe('RelatedCertificatePicker', () => {
    let root: Root;
    let state: Record<string, unknown>;

    const show = async (certificates: CertificateListResponseModel[], checkedRows: string[], onSelect: (certificate?: unknown) => void) => {
        state = {
            ...state,
            certificates: { ...certificatesInitialState, certificates },
            pagings: pagingReducer(undefined, pagingActions.setCheckedRows({ entity: EntityType.CERTIFICATE, checkedRows })),
        };
        await act(async () => {
            root.render(<RelatedCertificatePicker onSelect={onSelect} />);
        });
    };

    beforeEach(() => {
        state = {
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

    it('hands over the checked row itself', async () => {
        const onSelect = vi.fn();
        const first = listed('first');

        await show([first, listed('second')], ['first'], onSelect);

        expect(onSelect).toHaveBeenLastCalledWith(first);
    });

    it('keeps the checked row once the list has moved to a page without it', async () => {
        const onSelect = vi.fn();
        const first = listed('first');

        await show([first], ['first'], onSelect);
        await show([listed('third')], ['first'], onSelect);

        expect(onSelect).toHaveBeenLastCalledWith(first);
    });

    it('hands over nothing once the row is unchecked', async () => {
        const onSelect = vi.fn();

        await show([listed('first')], ['first'], onSelect);
        await show([listed('first')], [], onSelect);

        expect(onSelect).toHaveBeenLastCalledWith(undefined);
    });

    it('hands over nothing for a checked row the list never held', async () => {
        const onSelect = vi.fn();

        await show([listed('first')], ['stale'], onSelect);

        expect(onSelect).toHaveBeenLastCalledWith(undefined);
    });
});
