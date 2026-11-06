import { useState } from 'react';
import { MemoryRouter } from 'react-router';
import type { PageAction } from 'components/ActionsMenu';
import PageHeader from './index';

type ActionSpec = Omit<PageAction, 'onClick'>;

type Props = Readonly<{
    title?: string;
    primaryAction?: ActionSpec;
    actions?: ActionSpec[];
}>;

const BREADCRUMBS = [{ label: 'Inventory', href: '/inventory' }, { label: 'Certificates' }];

export function PageHeaderHarness({ title, primaryAction, actions }: Props) {
    const [ran, setRan] = useState<string[]>([]);
    const record = (spec: ActionSpec): PageAction => ({
        ...spec,
        onClick: (anchor) => setRan((seen) => [...seen, `${spec.id}:${anchor?.tagName ?? 'none'}`]),
    });
    const primary = primaryAction ? record(primaryAction) : undefined;
    const menu = actions?.map(record);

    return (
        <MemoryRouter>
            <PageHeader breadcrumbs={BREADCRUMBS} title={title} primaryAction={primary} actions={menu} />
            <output data-testid="ran">{ran.join(',')}</output>
        </MemoryRouter>
    );
}

export default PageHeaderHarness;
