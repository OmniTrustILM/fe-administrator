import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Buffer } from 'buffer';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Widget from 'components/Widget';
import Container from 'components/Container';
import AttributeViewer, { ATTRIBUTE_VIEWER_TYPE } from 'components/Attributes/AttributeViewer';
import ComplianceCheckResultWidget from 'components/_pages/certificates/ComplianceCheckResultWidget/ComplianceCheckResultWidget';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import { LockWidgetNameEnum } from 'types/user-interface';
import { createWidgetDetailHeaders } from 'utils/widget';
import { formatPEM, downloadFile } from 'utils/certificate';
import { useCopyToClipboard } from 'utils/common-hooks';
import type { CertificateDetailResponseModel } from 'types/certificate';
import { PlatformEnum, Resource } from 'types/openapi';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import Asn1Dialog from '../Asn1Dialog/Asn1Dialog';
import type { AttributeResponseModel } from 'types/attributes';
import { Download } from 'lucide-react';
import Dropdown from 'components/Dropdown';

type Props = Readonly<{
    certificate: CertificateDetailResponseModel | undefined;
    isBusy: boolean;
    getFreshCertificateDetail: () => void;
    setSelectedAttributesInfo: (attributes: AttributeResponseModel[] | null) => void;
}>;

export default function CertificateRequestContent({ certificate, isBusy, getFreshCertificateDetail, setSelectedAttributesInfo }: Props) {
    const copyToClipboard = useCopyToClipboard();

    const certificateRequestFormatEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.CertificateFormat));
    const certificateTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.CertificateType));

    const detailHeaders: TableHeader[] = useMemo(() => createWidgetDetailHeaders(), []);

    const fileNameToDownload = certificate?.commonName + '_' + certificate?.serialNumber;

    const downloadCSRDropDown = useMemo(
        () => (
            <Dropdown
                title={
                    <>
                        <Download size={16} aria-hidden="true" />
                        <span className="sr-only">Download</span>
                    </>
                }
                items={[
                    {
                        title: 'PEM (.pem)',
                        onClick: () =>
                            downloadFile(
                                formatPEM(certificate?.certificateRequest?.content ?? '', true),
                                fileNameToDownload + '_CSR' + '.pem',
                            ),
                    },
                    {
                        title: (
                            <div className="flex items-center gap-x-2">
                                <span>Copy PEM to clipboard</span>
                            </div>
                        ),
                        onClick: () => {
                            if (!certificate?.certificateRequest?.content) return;
                            copyToClipboard(
                                formatPEM(certificate?.certificateRequest?.content ?? '', true),
                                'Certificate request content was copied to clipboard',
                                'Failed to copy certificate request content to clipboard',
                            );
                        },
                    },
                    {
                        title: 'REQ (.req)',
                        onClick: () =>
                            downloadFile(
                                Buffer.from(certificate?.certificateRequest?.content ?? '', 'base64'),
                                fileNameToDownload + '_CSR' + '.req',
                            ),
                    },
                ]}
            />
        ),
        [certificate, fileNameToDownload, copyToClipboard],
    );

    const buttonsCSR: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'download',
                disabled: false,
                tooltip: 'Download CSR',
                custom: downloadCSRDropDown,
                onClick: () => {},
            },
        ],
        [downloadCSRDropDown],
    );

    const csrPropertiesData: TableDataRow[] = useMemo(() => {
        return certificate?.certificateRequest
            ? ([
                  {
                      id: 'commonName',
                      columns: ['Common Name', certificate?.certificateRequest?.commonName ?? ''],
                  },
                  {
                      id: 'certificateType',
                      columns: [
                          'Certificate Type',
                          certificate?.certificateRequest?.certificateType
                              ? getEnumLabel(certificateTypeEnum, certificate?.certificateRequest?.certificateType)
                              : '',
                      ],
                  },
                  {
                      id: 'certificateRequestFormat',
                      columns: [
                          'Certificate Request Format',
                          certificate?.certificateRequest?.certificateRequestFormat
                              ? getEnumLabel(certificateRequestFormatEnum, certificate?.certificateRequest?.certificateRequestFormat)
                              : '',
                      ],
                  },
                  {
                      id: 'publicKeyAlgorithm',
                      columns: ['Public Key Algorithm', certificate?.certificateRequest?.publicKeyAlgorithm ?? ''],
                  },
                  {
                      id: 'signatureAlgorithm',
                      columns: ['Signature Algorithm', certificate?.certificateRequest?.signatureAlgorithm ?? ''],
                  },
                  certificate.hybridCertificate
                      ? {
                            id: 'altSignatureAlgorithm',
                            columns: ['Alternative Signature Algorithm', certificate?.certificateRequest?.altSignatureAlgorithm ?? ''],
                        }
                      : null,
                  {
                      id: 'subjectDn',
                      columns: ['Subject DN', certificate?.certificateRequest?.subjectDn ?? ''],
                  },
                  {
                      id: 'asn1RequestStructure',
                      columns: [
                          'ASN.1 Structure',
                          certificate?.certificateRequest?.content ? (
                              <Asn1Dialog content={certificate?.certificateRequest?.content} isCSR={true} />
                          ) : (
                              <>n/a</>
                          ),
                      ],
                  },
              ].filter((el) => el !== null) as NonNullable<TableDataRow>[])
            : [];
    }, [certificate, certificateRequestFormatEnum, certificateTypeEnum]);

    return (
        <>
            <Container className="md:grid grid-cols-2 items-start">
                <Widget
                    widgetButtons={buttonsCSR}
                    title="Properties"
                    busy={isBusy}
                    titleSize="large"
                    lockSize="large"
                    refreshAction={getFreshCertificateDetail}
                >
                    <CustomTable headers={detailHeaders} data={csrPropertiesData} />
                </Widget>
                <Container>
                    <Widget title="Request Attributes" busy={isBusy} titleSize="large">
                        <AttributeViewer
                            viewerType={ATTRIBUTE_VIEWER_TYPE.ATTRIBUTE}
                            attributes={certificate?.certificateRequest?.attributes}
                        />
                    </Widget>

                    <Widget title="Signature Attributes" titleSize="large">
                        <AttributeViewer
                            viewerType={ATTRIBUTE_VIEWER_TYPE.ATTRIBUTE}
                            attributes={certificate?.certificateRequest?.signatureAttributes}
                        />
                    </Widget>
                </Container>
            </Container>
            <Container marginTop>
                {certificate?.hybridCertificate && (
                    <Widget title="Alternative Signature Attributes" titleSize="large">
                        <br />
                        <AttributeViewer
                            viewerType={ATTRIBUTE_VIEWER_TYPE.ATTRIBUTE}
                            attributes={certificate?.certificateRequest?.altSignatureAttributes}
                        />
                    </Widget>
                )}
                <ComplianceCheckResultWidget
                    resource={Resource.CertificateRequests}
                    widgetLockName={LockWidgetNameEnum.CertificateDetailsWidget}
                    objectUuid={certificate?.certificateRequest?.uuid ?? ''}
                    setSelectedAttributesInfo={setSelectedAttributesInfo}
                />
            </Container>
        </>
    );
}
