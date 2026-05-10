import AttributeViewer from 'components/Attributes/AttributeViewer';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import type { AttributeResponseModel } from 'types/attributes';

export const renderProtocolDetail = (
    isAvailable: boolean | undefined,
    inactiveLabel: string,
    profileHeaders: TableHeader[],
    profileData: TableDataRow[],
    issueAttrs?: AttributeResponseModel[],
    revokeAttrs?: AttributeResponseModel[],
): React.ReactNode => {
    if (!isAvailable) return <>{inactiveLabel}</>;
    return (
        <>
            <b>Protocol settings</b>
            <br />
            <br />
            <CustomTable hasHeader={false} headers={profileHeaders} data={profileData} />
            {issueAttrs && issueAttrs.length > 0 && (
                <>
                    <b>Settings for certificate issuing</b>
                    <br />
                    <br />
                    <AttributeViewer hasHeader={false} attributes={issueAttrs} />
                </>
            )}
            {revokeAttrs && revokeAttrs.length > 0 && (
                <>
                    <b>Settings for certificate revocation</b>
                    <br />
                    <br />
                    <AttributeViewer hasHeader={false} attributes={revokeAttrs} />
                </>
            )}
        </>
    );
};
