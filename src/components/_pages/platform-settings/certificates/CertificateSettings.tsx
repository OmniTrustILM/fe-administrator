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
            },
            {
                id: 'value',
                content: 'Value',
            },
        ],
        [],
    );

    const data: TableDataRow[] = useMemo(() => {
        const validation = platformSettings?.certificates?.validation;
        const registration = platformSettings?.certificates?.registration;
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
        <div style={{ paddingTop: '1.5em', paddingBottom: '1.5em' }}>
            <CustomTable headers={headers} data={data} />
        </div>
    );
};

export default CertificateSettings;
