import Spinner from 'components/Spinner';
import { actions as utilsActuatorActions, selectors as utilsActuatorSelectors } from 'ducks/utilsActuator';
import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Button from 'components/Button';
import { transformParseCertificateResponseDtoToAsn1String } from '../../../../ducks/transform/utilsCertificate';
import { actions as utilsCertificateActions, selectors as utilsCertificateSelectors } from '../../../../ducks/utilsCertificate';
import {
    actions as utilsCertificateRequestActions,
    selectors as utilsCertificateRequestSelectors,
} from '../../../../ducks/utilsCertificateRequest';

import { transformParseRequestResponseDtoToCertificateResponseDetailModelToAsn1String } from 'ducks/transform/utilsCertificateRequest';
import { ParseCertificateRequestDtoParseTypeEnum, ParseRequestRequestDtoParseTypeEnum } from '../../../../types/openapi/utils';
import { actions as userInterfaceActions } from 'ducks/user-interface';

type Props = {
    content: string;
    isCSR?: boolean;
};

export default function Asn1Dialog({ content, isCSR }: Readonly<Props>) {
    const dispatch = useDispatch();
    const parsedCertificate = useSelector(utilsCertificateSelectors.parsedCertificate);
    const parsedCertificateRequest = useSelector(utilsCertificateRequestSelectors.parsedCertificateRequest);
    const isFetchingCSRDetails = useSelector(utilsCertificateRequestSelectors.isFetchingDetail);
    const isFetchingDetail = useSelector(utilsCertificateSelectors.isFetchingDetail);

    const health = useSelector(utilsActuatorSelectors.health);

    const resetParsedData = useCallback(() => {
        dispatch(utilsCertificateActions.reset());
        dispatch(utilsCertificateRequestActions.reset());
    }, [dispatch]);

    const onClose = useCallback(() => {
        resetParsedData();
        dispatch(userInterfaceActions.hideGlobalModal());
    }, [resetParsedData, dispatch]);

    useEffect(() => {
        resetParsedData();
    }, [resetParsedData]);

    useEffect(() => {
        if (!health) {
            dispatch(utilsActuatorActions.health());
        }
    }, [dispatch, health]);

    useEffect(() => {
        if (parsedCertificate && !isCSR) {
            const asn1String = transformParseCertificateResponseDtoToAsn1String(parsedCertificate);
            if (asn1String) {
                dispatch(
                    userInterfaceActions.showGlobalModal({
                        isOpen: true,
                        size: 'xl',
                        title: 'ASN.1 Structure',
                        content: <pre className="text-sm overflow-x-auto text-[var(--dark-gray-color)]">{asn1String}</pre>,
                        showCloseButton: true,
                        cancelButtonCallback: onClose,
                    }),
                );
            }
        }
    }, [parsedCertificate, isCSR, dispatch, onClose]);

    useEffect(() => {
        if (parsedCertificateRequest && isCSR) {
            const asn1String = transformParseRequestResponseDtoToCertificateResponseDetailModelToAsn1String(parsedCertificateRequest);
            if (asn1String) {
                dispatch(
                    userInterfaceActions.showGlobalModal({
                        isOpen: true,
                        size: 'xl',
                        title: 'ASN.1 Structure',
                        content: <pre className="text-sm overflow-x-auto text-[var(--dark-gray-color)]">{asn1String}</pre>,
                        showCloseButton: true,
                        cancelButtonCallback: onClose,
                    }),
                );
            }
        }
    }, [parsedCertificateRequest, isCSR, dispatch, onClose]);

    return (
        <>
            <Spinner active={isFetchingDetail || isFetchingCSRDetails} />
            <Button
                variant="transparent"
                disabled={!health || isFetchingDetail || isFetchingCSRDetails}
                onClick={() => {
                    if (content && health) {
                        if (isCSR) {
                            dispatch(
                                utilsCertificateRequestActions.parseCertificateRequest({
                                    content,
                                    requestParseType: ParseRequestRequestDtoParseTypeEnum.Asn1,
                                }),
                            );
                        } else {
                            dispatch(
                                utilsCertificateActions.parseCertificate({
                                    certificate: content,
                                    parseType: ParseCertificateRequestDtoParseTypeEnum.Asn1,
                                }),
                            );
                        }
                    }
                }}
                title="Show ASN.1 Structure"
                className="text-[var(--primary-blue-color)] !p-0 hover:bg-transparent"
            >
                Show
            </Button>
        </>
    );
}
