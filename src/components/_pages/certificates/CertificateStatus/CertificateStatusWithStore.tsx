import type React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { createMockStore } from 'utils/test-helpers';
import CertificateStatus from './index';
import { CertificateState, CertificateValidationStatus, ComplianceStatus, PlatformEnum } from 'types/openapi';

const certificateStateLabels: Record<string, { label: string }> = {
    [CertificateState.Issued]: { label: 'Issued' },
    [CertificateState.Revoked]: { label: 'Revoked' },
    [CertificateState.PendingIssue]: { label: 'Pending issue' },
};
const validationStatusLabels: Record<string, { label: string }> = {
    [CertificateValidationStatus.Valid]: { label: 'Valid' },
    [CertificateValidationStatus.Expired]: { label: 'Expired' },
};
const complianceStatusLabels: Record<string, { label: string }> = {
    [ComplianceStatus.Ok]: { label: 'OK' },
    [ComplianceStatus.Nok]: { label: 'NOK' },
};

const preloadedState: Parameters<typeof createMockStore>[0] = {
    enums: {
        platformEnums: {
            [PlatformEnum.CertificateState]: certificateStateLabels,
            [PlatformEnum.CertificateValidationStatus]: validationStatusLabels,
            [PlatformEnum.ComplianceStatus]: complianceStatusLabels,
            [PlatformEnum.ComplianceRuleStatus]: {},
            [PlatformEnum.CertificateSubjectType]: {},
        },
    },
};

export type CertificateStatusWithStoreProps = Readonly<React.ComponentProps<typeof CertificateStatus>>;

export default function CertificateStatusWithStore(props: CertificateStatusWithStoreProps) {
    const store = createMockStore(preloadedState as any);
    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/']}>
                <CertificateStatus {...props} />
            </MemoryRouter>
        </Provider>
    );
}
