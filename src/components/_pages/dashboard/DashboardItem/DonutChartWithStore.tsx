import type React from 'react';
import { selectors as filterSelectors } from 'ducks/filters';
import { Provider, useSelector } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { createMockStore } from 'utils/test-helpers';
import DonutChart from './DonutChart';
import type { SearchFilterModel } from 'types/certificate';
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
    const isPending = useSelector(filterSelectors.handedInFilters(entity))?.source === 'drill-down';
    return <span data-testid="drill-down-pending">{String(isPending)}</span>;
}

export type DonutChartWithStoreProps = Readonly<
    React.ComponentProps<typeof DonutChart> & {
        /** What a legend click filters on, built browser-side: a function prop's return value does not cross into the page. */
        legendFilters?: SearchFilterModel[];
    }
>;

export default function DonutChartWithStore({ legendFilters, ...props }: DonutChartWithStoreProps) {
    const store = createMockStore(preloadedState);
    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/']}>
                <DonutChart {...props} onSetFilter={legendFilters ? () => legendFilters : props.onSetFilter} />
                <DrillDownProbe entity={props.entity} />
            </MemoryRouter>
        </Provider>
    );
}
