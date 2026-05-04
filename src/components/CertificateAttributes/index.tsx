import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import { useMemo } from 'react';
import type { CertificateDetailResponseModel } from 'types/certificate';
import { dateFormatter } from 'utils/dateUtil';

interface Props {
    certificate?: CertificateDetailResponseModel;
    csr?: boolean;
    isLoading?: boolean;
}

function CertificateAttributes({ certificate, csr = false, isLoading = false }: Props) {
    const detailHeaders: TableHeader[] = useMemo(
        () => [
            {
                id: 'name',
                content: 'Attribute',
            },
            {
                id: 'value',
                content: 'Value',
            },
        ],
        [],
    );

    const attributes: TableDataRow[] = useMemo(() => {
        const result: TableDataRow[] = [
            {
                id: 'subjectDN',
                columns: ['Subject DN', certificate?.subjectDn || ''],
            },
        ];
        if (!csr) {
            result.push(
                {
                    id: 'issuerDN',
                    columns: ['Issuer DN', certificate?.issuerDn || ''],
                },
                {
                    id: 'validFrom',
                    columns: [
                        'Valid From',
                        <span style={{ whiteSpace: 'nowrap' }}>{certificate?.notBefore ? dateFormatter(certificate.notBefore) : ''}</span>,
                    ],
                },
                {
                    id: 'validTo',
                    columns: [
                        'Valid To',
                        <span style={{ whiteSpace: 'nowrap' }}>{certificate?.notAfter ? dateFormatter(certificate.notAfter) : ''}</span>,
                    ],
                },
                {
                    id: 'serialNumber',
                    columns: ['Serial Number', certificate?.serialNumber || ''],
                },
            );
        }
        return result;
    }, [certificate, csr]);

    if (isLoading) {
        return <CustomTable headers={detailHeaders} data={[]} isLoading />;
    }

    return (
        <>
            {certificate ? (
                <CustomTable headers={detailHeaders} data={attributes} />
            ) : (
                <div className="text-center">Certificate information not available</div>
            )}
        </>
    );
}

export default CertificateAttributes;
