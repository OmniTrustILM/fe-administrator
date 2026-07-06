import type React from 'react';
import { Provider } from 'react-redux';
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

export type DonutChartWithStoreProps = Readonly<React.ComponentProps<typeof DonutChart>>;

export default function DonutChartWithStore(props: DonutChartWithStoreProps) {
    const store = createMockStore(preloadedState);
    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/']}>
                <DonutChart {...props} />
            </MemoryRouter>
        </Provider>
    );
}
