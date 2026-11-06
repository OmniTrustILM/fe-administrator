import { useState } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import type { PageAction } from 'components/ActionsMenu';
import { LockTypeEnum, LockWidgetNameEnum } from 'types/user-interface';
import { createMockStore } from 'utils/test-helpers';
import PageHeader from './index';

type ActionSpec = Omit<PageAction, 'onClick'>;

type Props = Readonly<{
    title?: string;
    primaryAction?: ActionSpec;
    actions?: ActionSpec[];
    /** Preloads a lock on the page's widget, as a refused or failed page request leaves. */
    locked?: boolean;
}>;

const BREADCRUMBS = [{ label: 'Inventory', href: '/inventory' }, { label: 'Certificates' }];
const LOCK_NAME = LockWidgetNameEnum.ListOfCertificates;

export function PageHeaderHarness({ title, primaryAction, actions, locked = false }: Props) {
    const [store] = useState(() =>
        createMockStore({
            userInterface: {
                widgetLocks: locked
                    ? [{ widgetName: LOCK_NAME, lockTitle: 'Access denied', lockText: 'No permission', lockType: LockTypeEnum.PERMISSION }]
                    : [],
            },
        } as never),
    );
    const [ran, setRan] = useState<string[]>([]);
    const record = (spec: ActionSpec): PageAction => ({
        ...spec,
        onClick: (anchor) => setRan((seen) => [...seen, `${spec.id}:${anchor?.tagName ?? 'none'}`]),
    });

    return (
        <Provider store={store}>
            <MemoryRouter>
                <PageHeader
                    breadcrumbs={BREADCRUMBS}
                    title={title}
                    primaryAction={primaryAction ? record(primaryAction) : undefined}
                    actions={actions?.map(record)}
                    widgetLockName={LOCK_NAME}
                />
                <output data-testid="ran">{ran.join(',')}</output>
            </MemoryRouter>
        </Provider>
    );
}

export default PageHeaderHarness;
