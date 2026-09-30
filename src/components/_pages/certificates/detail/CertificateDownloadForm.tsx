import { Buffer } from 'buffer';
import { actions as userInterfaceActions } from '../../../../ducks/user-interface';

import { actions as alertActions } from 'ducks/alerts';
import { selectors as authSelectors } from 'ducks/auth';
import { actions, selectors } from 'ducks/certificates';

import { CertificateFormat, CertificateFormatEncoding, KeyType } from '../../../../types/openapi';

import { selectors as enumSelectors } from 'ducks/enums';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { downloadFile } from 'utils/certificate';

import { PlatformEnum, Resource, ResourceAction } from 'types/openapi';
import { hasResourceAction } from 'utils/permissions';

import Button from 'components/Button';
import Container from 'components/Container';
import DropDownListForm from 'components/DropDownForm';
import Select from 'components/Select';
import Switch from 'components/Switch';
import KeystoreDownloadDialog, { KEYSTORE_FORMAT_OPTION } from '../KeystoreDownloadDialog';

interface ChainDownloadSwitchState {
    isDownloadTriggered: boolean;
    certificateEncoding?: CertificateFormatEncoding;
    certificateFormat?: CertificateFormat;
    isCopyTriggered?: boolean;
}

const CertificateDownloadForm = () => {
    const dispatch = useDispatch();
    const certificate = useSelector(selectors.certificateDetail);
    const profile = useSelector(authSelectors.profile);
    const certificateChainDownloadContent = useSelector(selectors.certificateChainDownloadContent);
    const certificateDownloadContent = useSelector(selectors.certificateDownloadContent);
    const certificateRequestFormatEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.CertificateFormat));
    const certificateFormatEncodingEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.CertificateFormatEncoding));
    const isFetchingCertificateChainDownloadContent = useSelector(selectors.isFetchingCertificateChainDownloadContent);
    const isFetchingCertificateDownloadContent = useSelector(selectors.isFetchingCertificateDownloadContent);
    // A PKCS#12 download in flight keeps its format, so that its dialog is not unmounted under it.
    const isDownloadingKeystore = useSelector(selectors.isDownloadingKeystore);

    const [chainDownloadSwitch, setChainDownloadSwitch] = useState<ChainDownloadSwitchState>({ isDownloadTriggered: false });
    const [certificateDownloadSwitch, setCertificateDownloadSwitch] = useState<ChainDownloadSwitchState>({ isDownloadTriggered: false });
    const [isDownloadFormCertificateChain, setIsDownloadFormCertificateChain] = useState<boolean>(false);
    const [certificateFormatValue, setCertificateFormatValue] = useState<string>('');

    const fileNameToDownload = certificate?.commonName + '_' + certificate?.serialNumber;

    const certificateFormatEncodingMap = useMemo(() => {
        return {
            [CertificateFormat.Raw]: {
                [CertificateFormatEncoding.Pem]: '.pem',
                [CertificateFormatEncoding.Der]: '.cer',
            },
            [CertificateFormat.Pkcs7]: {
                [CertificateFormatEncoding.Pem]: '.p7c',
                [CertificateFormatEncoding.Der]: '.p7b',
            },
        };
    }, []);

    const certificateChainFormatEncodingMap = useMemo(() => {
        return {
            [CertificateFormat.Raw]: {
                [CertificateFormatEncoding.Pem]: '.pem',
                [CertificateFormatEncoding.Der]: null,
            },
            [CertificateFormat.Pkcs7]: {
                [CertificateFormatEncoding.Pem]: '.p7c',
                [CertificateFormatEncoding.Der]: '.p7b',
            },
        };
    }, []);

    const certificateFormatOptions = Object.values(certificateRequestFormatEnum).map((item) => {
        return {
            label: item.label,
            value: item.code,
            description: item.description,
        };
    });

    const certificateEncodingOptions = Object.values(certificateFormatEncodingEnum).map((item) => {
        return {
            label: item.label,
            value: item.code,
            description: item.description,
        };
    });

    const privateKeyItem = certificate?.key?.items.find((item) => item.type === KeyType.Private);
    // The certificate comes with its private key, so the download asks for the key export permission.
    const keystoreOfferable =
        !!certificate?.keystoreAvailable && !!privateKeyItem && hasResourceAction(profile, Resource.Keys, ResourceAction.ExportKey);

    const certificateFormatOptionsWithKeystore = keystoreOfferable
        ? [...certificateFormatOptions, { label: KEYSTORE_FORMAT_OPTION.label, value: KEYSTORE_FORMAT_OPTION.value }]
        : certificateFormatOptions;

    const isPkcs12Chosen = !isDownloadFormCertificateChain && certificateFormatValue === KEYSTORE_FORMAT_OPTION.value;

    const closeDialog = useCallback(() => dispatch(userInterfaceActions.hideGlobalModal()), [dispatch]);

    const downloadCertificateChainContent = useCallback(
        (certificateFormat: CertificateFormat, certificateEncoding: CertificateFormatEncoding) => {
            if (!certificate) return;
            dispatch(
                actions.downloadCertificateChain({
                    certificateFormat: certificateFormat,
                    uuid: certificate.uuid,
                    withEndCertificate: true,
                    encoding: certificateEncoding,
                }),
            );
            setChainDownloadSwitch({
                isDownloadTriggered: true,
                certificateEncoding: certificateEncoding,
                certificateFormat: certificateFormat,
            });
        },
        [certificate, dispatch],
    );

    const downloadCertificateContent = useCallback(
        (certificateFormat: CertificateFormat, certificateEncoding: CertificateFormatEncoding) => {
            if (!certificate) return;
            dispatch(
                actions.downloadCertificate({
                    certificateFormat: certificateFormat,
                    uuid: certificate.uuid,
                    encoding: certificateEncoding,
                }),
            );
            setCertificateDownloadSwitch({
                isDownloadTriggered: true,
                certificateEncoding: certificateEncoding,
                certificateFormat: certificateFormat,
            });
        },
        [certificate, dispatch],
    );

    useEffect(() => {
        if (
            !certificateChainDownloadContent ||
            !chainDownloadSwitch.isDownloadTriggered ||
            !chainDownloadSwitch.certificateFormat ||
            !chainDownloadSwitch.certificateEncoding
        )
            return;

        let extensionFormat;

        extensionFormat =
            certificateChainFormatEncodingMap[chainDownloadSwitch.certificateFormat]?.[chainDownloadSwitch.certificateEncoding];

        if (!extensionFormat) {
            dispatch(alertActions.error('There was some error with the extension format.'));
            return;
        }

        downloadFile(Buffer.from(certificateChainDownloadContent.content ?? '', 'base64'), fileNameToDownload + '_chain' + extensionFormat);

        setChainDownloadSwitch({ isDownloadTriggered: false });
    }, [certificateChainDownloadContent, chainDownloadSwitch, fileNameToDownload, certificateChainFormatEncodingMap, dispatch]);

    useEffect(() => {
        if (
            !certificateDownloadContent ||
            !certificateDownloadSwitch.isDownloadTriggered ||
            !certificateDownloadSwitch.certificateFormat ||
            !certificateDownloadSwitch.certificateEncoding
        )
            return;
        if (certificateDownloadSwitch.isCopyTriggered) {
            setCertificateDownloadSwitch({ isDownloadTriggered: false });
            return;
        }

        let extensionFormat;

        extensionFormat =
            certificateFormatEncodingMap[certificateDownloadSwitch.certificateFormat]?.[certificateDownloadSwitch.certificateEncoding];

        if (!extensionFormat) {
            dispatch(alertActions.error('There was some error with the extension format.'));
        }

        downloadFile(Buffer.from(certificateDownloadContent.content ?? '', 'base64'), fileNameToDownload + extensionFormat);

        setCertificateDownloadSwitch({ isDownloadTriggered: false });
    }, [certificateDownloadContent, certificateDownloadSwitch, fileNameToDownload, certificateFormatEncodingMap, dispatch]);

    return (
        <>
            {/* A PKCS12 container always carries the chain, so the switch is only for the other formats. */}
            {!isPkcs12Chosen && (
                <Switch
                    id="certificateChainSwitch"
                    label="Certificate Chain"
                    className="mb-4"
                    checked={isDownloadFormCertificateChain ?? false}
                    onChange={() => {
                        setIsDownloadFormCertificateChain(!isDownloadFormCertificateChain);
                        setCertificateFormatValue('');
                    }}
                />
            )}

            {!isDownloadFormCertificateChain && (
                <Select
                    id="certificateFormat"
                    label="Certificate Format"
                    placeholder="Select Certificate Format"
                    options={certificateFormatOptionsWithKeystore}
                    value={certificateFormatValue}
                    isDisabled={isDownloadingKeystore}
                    onChange={(value) => setCertificateFormatValue(value as string)}
                    showOptionDescriptionInDropdown
                    showSelectedDescriptionAsHelp
                />
            )}

            {isDownloadFormCertificateChain && (
                <DropDownListForm
                    isBusy={isFetchingCertificateDownloadContent || isFetchingCertificateChainDownloadContent}
                    onClose={() => {
                        dispatch(userInterfaceActions.hideGlobalModal());
                    }}
                    onSubmit={(values) => {
                        if (values.certificateFormat && values.certificateEncoding && certificate?.uuid) {
                            downloadCertificateChainContent(
                                values.certificateFormat as CertificateFormat,
                                values.certificateEncoding as CertificateFormatEncoding,
                            );
                        }
                    }}
                    dropDownOptionsList={[
                        {
                            formLabel: 'Certificate Chain Format',
                            formValue: 'certificateFormat',
                            options: certificateFormatOptions,
                            showOptionDescriptionInDropdown: true,
                            showSelectedDescriptionAsHelp: true,
                        },
                        {
                            formLabel: 'Certificate Chain Encoding',
                            formValue: 'certificateEncoding',
                            options: certificateEncodingOptions,
                            placement: 'top',
                            showOptionDescriptionInDropdown: true,
                            showSelectedDescriptionAsHelp: true,
                        },
                    ]}
                />
            )}

            {!isDownloadFormCertificateChain && !certificateFormatValue && (
                <Container className="flex-row justify-end modal-footer mt-4" gap={4}>
                    <Button variant="outline" onClick={closeDialog}>
                        Cancel
                    </Button>
                </Container>
            )}

            {/* Format and Encoding are validated together: nothing else shows until a format is chosen, so a
                download can never be submitted without one. */}
            {!isDownloadFormCertificateChain &&
                !!certificateFormatValue &&
                (isPkcs12Chosen ? (
                    certificate?.key &&
                    privateKeyItem && (
                        <div className="mt-4">
                            <KeystoreDownloadDialog
                                certificateUuid={certificate.uuid}
                                certificateName={certificate.commonName}
                                keyUuid={certificate.key.uuid}
                                privateKeyItemUuid={privateKeyItem.uuid}
                                onClose={() => dispatch(userInterfaceActions.hideGlobalModal())}
                            />
                        </div>
                    )
                ) : (
                    <DropDownListForm
                        isBusy={isFetchingCertificateDownloadContent || isFetchingCertificateChainDownloadContent}
                        onClose={() => {
                            dispatch(userInterfaceActions.hideGlobalModal());
                        }}
                        onSubmit={(values) => {
                            if (certificateFormatValue && values.certificateEncoding && certificate?.uuid) {
                                downloadCertificateContent(
                                    certificateFormatValue as CertificateFormat,
                                    values.certificateEncoding as CertificateFormatEncoding,
                                );
                            }
                        }}
                        dropDownOptionsList={[
                            {
                                formLabel: 'Certificate Encoding',
                                formValue: 'certificateEncoding',
                                options: certificateEncodingOptions,
                                placement: 'top',
                                showOptionDescriptionInDropdown: true,
                                showSelectedDescriptionAsHelp: true,
                            },
                        ]}
                    />
                ))}
        </>
    );
};

export default CertificateDownloadForm;
