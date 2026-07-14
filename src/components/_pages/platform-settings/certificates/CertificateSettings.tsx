import { useMemo } from 'react';
import type { SettingsPlatformModel } from 'types/settings';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Switch from 'components/Switch';
import { renderExpiringThresholdLabel, renderValidationFrequencyLabel } from 'utils/certificate-validation';

type Props = {
    platformSettings?: SettingsPlatformModel;
};

const CertificateSettings = ({ platformSettings }: Props) => {
    const headers: TableHeader[] = useMemo(
        () => [
            {
                id: 'setting',
                content: 'Setting',
                width: '40%',
            },
            {
                id: 'value',
                content: 'Value',
            },
        ],
        [],
    );

    const validationData: TableDataRow[] = useMemo(() => {
        const validation = platformSettings?.certificates?.validation;
        const rows: TableDataRow[] = [];

        if (validation) {
            rows.push({
                id: 'enabled',
                columns: [
                    'Validation Enabled',
                    <Switch key="enabled" id="validationEnabled" disabled checked={validation.enabled} onChange={() => {}} />,
                ],
            });
            if (validation.enabled && typeof validation.frequency === 'number' && typeof validation.expiringThreshold === 'number') {
                rows.push(
                    {
                        id: 'validationFrequency',
                        columns: ['Validation Frequency', renderValidationFrequencyLabel(validation.frequency)],
                    },
                    {
                        id: 'expiringThreshold',
                        columns: ['Expiring Threshold', renderExpiringThresholdLabel(validation.expiringThreshold)],
                    },
                );
            }
        }

        return rows;
    }, [platformSettings]);

    const registrationData: TableDataRow[] = useMemo(() => {
        const registration = platformSettings?.certificates?.registration;
        const rows: TableDataRow[] = [];

        if (registration) {
            rows.push(
                {
                    id: 'defaultIssuanceWindowDays',
                    columns: ['Default Issuance Window (days)', registration.defaultIssuanceWindowDays?.toString() ?? ''],
                },
                {
                    id: 'maxFailedAttempts',
                    columns: ['Max Failed Attempts', registration.maxFailedAttempts?.toString() ?? ''],
                },
            );
        }

        return rows;
    }, [platformSettings]);

    return (
        <div style={{ paddingTop: '1.5em', paddingBottom: '1.5em' }} className="space-y-6">
            <div className="space-y-2">
                <h3 className="text-lg font-bold text-[var(--dark-gray-color)] dark:text-neutral-200">Validation</h3>
                <CustomTable headers={headers} data={validationData} />
            </div>
            <div className="space-y-2">
                <h3 className="text-lg font-bold text-[var(--dark-gray-color)] dark:text-neutral-200">Registration</h3>
                <CustomTable headers={headers} data={registrationData} />
            </div>
        </div>
    );
};

export default CertificateSettings;
