import CertificateStatus from 'components/_pages/certificates/CertificateStatus';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Widget from 'components/Widget';
import { useDispatch, useSelector } from 'react-redux';
import type { AppState } from 'ducks';
import { dateFormatter } from 'utils/dateUtil';
import { selectors as complianceProfilesSelectors, actions as complianceProfilesActions } from 'ducks/compliance-profiles';
import type { LockWidgetNameEnum } from 'types/user-interface';
import type { ComplianceStatus, Resource } from 'types/openapi';
import { useCallback, useEffect, useMemo } from 'react';
import Button from 'components/Button';
import { Info } from 'lucide-react';
import type { AttributeResponseModel } from 'types/attributes';

type Props = Readonly<{
    objectUuid: string;
    resource: Resource;
    widgetLockName: LockWidgetNameEnum;
    setSelectedAttributesInfo: (attributes: AttributeResponseModel[]) => void;
}>;

export default function ComplianceCheckResultWidget({ widgetLockName, objectUuid, setSelectedAttributesInfo, resource }: Props) {
    const dispatch = useDispatch();
    const complianceCheckResult = useSelector((s: AppState) =>
        complianceProfilesSelectors.complianceCheckResultBy(s, resource, objectUuid),
    );

    const isFetchingComplianceCheckResult = useSelector((s: AppState) =>
        complianceProfilesSelectors.isFetchingComplianceCheckResultBy(s, resource, objectUuid),
    );
    const getFreshComplianceCheckResult = useCallback(() => {
        dispatch(complianceProfilesActions.getComplianceCheckResult({ resource: resource, objectUuid: objectUuid }));
    }, [dispatch, objectUuid, resource]);

    useEffect(() => {
        getFreshComplianceCheckResult();
    }, [getFreshComplianceCheckResult]);

    const complianceHeaders: TableHeader[] = useMemo(
        () => [
            { id: 'name', content: 'Name' },
            { id: 'description', content: 'Description' },
            {
                id: 'status',
                content: 'Status',
            },
            { id: 'provider', content: 'Provider' },
            { id: 'kind', content: 'Kind' },
            { id: 'attributes', content: 'Attributes' },
        ],
        [],
    );

    const complianceData: TableDataRow[] = useMemo(() => {
        if (!complianceCheckResult) return [];
        return complianceCheckResult.failedRules.map((rule) => ({
            id: rule.uuid,
            columns: [
                rule.name || '',
                rule.description || '',
                <CertificateStatus key={rule.uuid} status={rule.status || ''} />,
                rule.connectorName || '',
                rule.kind || '',
                rule.attributes?.length ? (
                    <Button
                        variant="transparent"
                        title="Attributes"
                        onClick={() => {
                            setSelectedAttributesInfo(rule.attributes || []);
                        }}
                    >
                        <Info size={16} style={{ color: 'auto' }} />
                    </Button>
                ) : (
                    ''
                ),
            ],
        }));
    }, [complianceCheckResult, setSelectedAttributesInfo]);

    return (
        <Widget
            title="Compliance Status"
            busy={isFetchingComplianceCheckResult}
            titleSize="large"
            lockSize="normal"
            widgetLockName={widgetLockName}
            refreshAction={getFreshComplianceCheckResult}
            dataTestId="compliance-status-widget"
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <CertificateStatus badgeSize="medium" status={(complianceCheckResult?.status as ComplianceStatus) || ''} />
                </div>
                {complianceCheckResult?.timestamp && (
                    <>
                        <div style={{ width: '1px', height: '20px', backgroundColor: '#E5E7EB' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <span>Checked:</span>
                            <span>{dateFormatter(complianceCheckResult?.timestamp || '')}</span>
                        </div>
                    </>
                )}
            </div>
            {complianceCheckResult?.message && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span>Message:</span>
                    <span>{complianceCheckResult?.message}</span>
                </div>
            )}
            <CustomTable headers={complianceHeaders} data={complianceData} hasPagination={true} />
        </Widget>
    );
}
