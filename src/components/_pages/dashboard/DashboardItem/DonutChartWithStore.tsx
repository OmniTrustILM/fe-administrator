import type React from 'react';
import { selectors as filterSelectors } from 'ducks/filters';
import { Provider, useSelector } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { createMockStore } from 'utils/test-helpers';
import DonutChart from './DonutChart';
import { PlatformEnum, CertificateState } from 'types/openapi';

const certificateStateLabels: Record<string, { label: string }> = {
    [CertificateState.Issued]: { label: 'Issued' },
    [CertificateState.Revoked]: { label: 'Revoked' },
};

const preloadedState: Parameters<typeof createMockStore>[0] = {
    enums: {
        platformEnums: {
            [PlatformEnum.CertificateState]: certificateStateLabels,
            [PlatformEnum.CertificateValidationStatus]: {},
            [PlatformEnum.ComplianceStatus]: {},
            [PlatformEnum.ComplianceRuleStatus]: {},
            [PlatformEnum.CertificateSubjectType]: {},
        },
    },
};

function DrillDownProbe({ entity }: Readonly<{ entity: DonutChartWithStoreProps['entity'] }>) {
    const isPending = useSelector(filterSelectors.isDrillDownPending(entity));
    return <span data-testid="drill-down-pending">{String(isPending)}</span>;
}

export type DonutChartWithStoreProps = Readonly<React.ComponentProps<typeof DonutChart>>;

export default function DonutChartWithStore(props: DonutChartWithStoreProps) {
    const store = createMockStore(preloadedState);
    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/']}>
                <DonutChart {...props} />
                <DrillDownProbe entity={props.entity} />
            </MemoryRouter>
        </Provider>
    );
}
