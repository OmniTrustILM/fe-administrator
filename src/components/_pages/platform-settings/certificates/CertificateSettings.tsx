import { useMemo } from 'react';
import type { SettingsPlatformModel } from 'types/settings';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Switch from 'components/Switch';
import { renewalInfoFormValuesFromDto } from 'ducks/transform/renewal-info-settings';
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

    const uploadData: TableDataRow[] = useMemo(() => {
        const upload = platformSettings?.certificates?.upload;
        const rows: TableDataRow[] = [];

        if (upload) {
            rows.push({
                id: 'automaticOwnership',
                columns: [
                    'Automatic Ownership',
                    <Switch
                        key="automaticOwnership"
                        id="uploadAutomaticOwnership"
                        label="Automatic Ownership"
                        labelClassName="sr-only"
                        disabled
                        checked={upload.automaticOwnership}
                        onChange={() => {}}
                    />,
                ],
            });
        }

        return rows;
    }, [platformSettings]);

    const renewalInfoData: TableDataRow[] = useMemo(() => {
        const renewalInfo = renewalInfoFormValuesFromDto(platformSettings?.certificates?.renewalInfo);

        return [
            { id: 'refreshMinHours', columns: ['Refresh Minimum Interval', `${renewalInfo.refreshMinHours} (hours)`] },
            { id: 'refreshMaxHours', columns: ['Refresh Maximum Interval', `${renewalInfo.refreshMaxHours} (hours)`] },
            { id: 'refreshDefaultHours', columns: ['Refresh Default Interval', `${renewalInfo.refreshDefaultHours} (hours)`] },
            { id: 'refreshBatchSize', columns: ['Refresh Batch Size', renewalInfo.refreshBatchSize] },
            { id: 'refreshRecheckDays', columns: ['Refresh Re-check Interval', `${renewalInfo.refreshRecheckDays} (days)`] },
        ];
    }, [platformSettings]);

    return (
        <div style={{ paddingTop: '1.5em', paddingBottom: '1.5em' }} className="space-y-6">
            <div className="space-y-2">
                <h3 className="text-lg font-bold text-content">Validation</h3>
                <CustomTable headers={headers} data={validationData} />
            </div>
            <div className="space-y-2">
                <h3 className="text-lg font-bold text-content">Registration</h3>
                <CustomTable headers={headers} data={registrationData} />
            </div>
            <div className="space-y-2">
                <h3 className="text-lg font-bold text-content">Upload</h3>
                <CustomTable headers={headers} data={uploadData} />
            </div>
            <div className="space-y-2">
                <h3 className="text-lg font-bold text-content">Renewal Information</h3>
                <CustomTable headers={headers} data={renewalInfoData} />
            </div>
        </div>
    );
};

export default CertificateSettings;
