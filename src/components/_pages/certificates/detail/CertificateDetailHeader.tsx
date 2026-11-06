import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { PageAction } from 'components/ActionsMenu';
import type { BreadcrumbItem } from 'components/Breadcrumb';
import Dialog from 'components/Dialog';
import PageHeader from 'components/PageHeader';
import { actions, selectors } from 'ducks/certificates';
import { actions as userInterfaceActions } from 'ducks/user-interface';
import type { AttributeRequestModel } from 'types/attributes';
import type { CertificateDetailResponseModel, CertificateRegistrationRequestModel } from 'types/certificate';
import { CertificateRegistrationState, CertificateRequestFormat, CertificateState as CertStatus } from 'types/openapi';
import { formatPEM } from 'utils/certificate';
import { useCopyToClipboard } from 'utils/common-hooks';
import CertificateRekeyDialog from '../CertificateRekeyDialog';
import CertificateRenewDialog from '../CertificateRenewDialog';
import CertificateRevokeDialog from '../CertificateRevokeDialog';
import CertificateDownloadForm from './CertificateDownloadForm';
import CompleteRegisteredDialog from './CompleteRegisteredDialog';
import { registrationStateLabels } from './registrationStateLabels';

type Props = Readonly<{
    certificate: CertificateDetailResponseModel | undefined;
    breadcrumbs: BreadcrumbItem[];
    getFreshCertificateDetail: () => void;
}>;

const requiredStateLabels: Partial<Record<CertStatus, string>> = {
    [CertStatus.Requested]: 'Only for requested certificates',
    [CertStatus.Issued]: 'Only for issued certificates',
    [CertStatus.Registered]: 'Only for registered certificates',
};

function lifecycleBlocker(certificate: CertificateDetailResponseModel | undefined, requiredState: CertStatus): string | undefined {
    if (certificate?.archived) return 'The certificate is archived';
    if (!certificate?.raProfile) return 'The certificate has no RA profile';
    if (certificate.state !== requiredState) return requiredStateLabels[requiredState];
    return undefined;
}

function completeBlocker(certificate: CertificateDetailResponseModel | undefined): string | undefined {
    // Core rejects completion once the registration authorization is no longer Active (Expired/Locked/
    // Closed) or its issuance window has elapsed, so gate the Complete action on the same conditions.
    const registration = certificate?.registration;
    if (registration?.state && registration.state !== CertificateRegistrationState.Active) {
        return `Registration is ${registrationStateLabels[registration.state] ?? registration.state}`;
    }
    if (registration?.expiresAt && new Date(registration.expiresAt).getTime() < Date.now()) {
        return 'The issuance window has elapsed';
    }
    return lifecycleBlocker(certificate, CertStatus.Registered);
}

const blocked = (reason: string | undefined) => ({ disabled: !!reason, disabledReason: reason });

function archiveBlocker(targetArchived: boolean, isArchived: boolean, isArchiving: boolean): string | undefined {
    if (isArchived === targetArchived) return targetArchived ? 'The certificate is already archived' : 'The certificate is not archived';
    return isArchiving ? 'Archiving is in progress' : undefined;
}

export default function CertificateDetailHeader({ certificate, breadcrumbs, getFreshCertificateDetail }: Props) {
    const dispatch = useDispatch();
    const copyToClipboard = useCopyToClipboard();

    const isArchiving = useSelector(selectors.isArchiving);
    const renewErrorMessage = useSelector(selectors.renewErrorMessage);
    const rekeyErrorMessage = useSelector(selectors.rekeyErrorMessage);
    const registerErrorMessage = useSelector(selectors.registerErrorMessage);
    const isRenewing = useSelector(selectors.isRenewing);
    const isRegistering = useSelector(selectors.isRegistering);
    const isRekeying = useSelector(selectors.isRekeying);

    const [confirmDelete, setConfirmDelete] = useState(false);
    const [renew, setRenew] = useState(false);
    const [rekey, setRekey] = useState(false);
    const [revoke, setRevoke] = useState(false);
    const [complete, setComplete] = useState(false);

    const onComplianceCheck = useCallback(() => {
        if (!certificate?.uuid) return;
        dispatch(actions.checkCompliance({ certificateUuids: [certificate.uuid] }));
    }, [dispatch, certificate]);

    const onDownloadClick = useCallback(() => {
        dispatch(
            userInterfaceActions.showGlobalModal({
                content: <CertificateDownloadForm />,
                isOpen: true,
                size: 'md',
                title: 'Download',
                icon: 'download',
            }),
        );
    }, [dispatch]);

    const onDeleteConfirmed = useCallback(() => {
        if (!certificate) return;
        dispatch(actions.deleteCertificate({ uuid: certificate.uuid }));
        setConfirmDelete(false);
    }, [certificate, dispatch]);

    // The renew and rekey dialogs close themselves once the operation or registration is confirmed; a failure keeps them open.
    const onRenew = useCallback(
        (data: { fileContent?: string; authorizationSecret?: string; attributes: AttributeRequestModel[] }) => {
            dispatch(
                actions.renewCertificate({
                    uuid: certificate?.uuid || '',
                    renewRequest: {
                        format: CertificateRequestFormat.Pkcs10,
                        request: data.fileContent,
                        authorizationSecret: data.authorizationSecret,
                        attributes: data.attributes,
                    },
                    raProfileUuid: certificate?.raProfile?.uuid || '',
                    authorityUuid: certificate?.raProfile?.authorityInstanceUuid || '',
                }),
            );
        },
        [dispatch, certificate],
    );

    const onRegisterSuccessor = useCallback(
        (registerRequest: CertificateRegistrationRequestModel) => {
            dispatch(
                actions.registerCertificate({
                    authorityUuid: certificate?.raProfile?.authorityInstanceUuid || '',
                    raProfileUuid: certificate?.raProfile?.uuid || '',
                    registerRequest,
                    inlineErrors: true,
                }),
            );
        },
        [dispatch, certificate],
    );

    // A failed renew or rekey leaves the dialog open without refetching (a refetch would unmount it), yet a wrong
    // challenge still spends an attempt and can lock the registration. Remember the failure for the dismiss rather than
    // reading the error then: switching the Register mode or retrying clears the error, not what Core recorded.
    const attemptFailed = useRef(false);
    useEffect(() => {
        if (renewErrorMessage || registerErrorMessage || rekeyErrorMessage) attemptFailed.current = true;
    }, [renewErrorMessage, registerErrorMessage, rekeyErrorMessage]);

    const closeOperationDialog = useCallback(
        (close: () => void) => {
            close();
            if (attemptFailed.current) {
                attemptFailed.current = false;
                getFreshCertificateDetail();
            }
        },
        [getFreshCertificateDetail],
    );

    // Neither dialog can be dismissed mid-request: its outcome is shown only in the dialog.
    const onCloseRenew = useCallback(() => {
        if (!isRenewing && !isRegistering) closeOperationDialog(() => setRenew(false));
    }, [isRenewing, isRegistering, closeOperationDialog]);

    const onCloseRekey = useCallback(() => {
        if (!isRekeying && !isRegistering) closeOperationDialog(() => setRekey(false));
    }, [isRekeying, isRegistering, closeOperationDialog]);

    // A confirmed operation redirects to the new certificate, so the one it left needs no refetch.
    const onRenewDone = useCallback(() => setRenew(false), []);
    const onRekeyDone = useCallback(() => setRekey(false), []);

    const onCloseCompleteRegistration = useCallback(() => {
        setComplete(false);
        // On failure the dialog stays open without refetching (a refetch would unmount it), so the
        // registration state shown here (failedAttempts / lock) can be stale by the time it closes.
        // Refresh it on dismiss so the detail reflects whatever the backend recorded on the last attempt.
        getFreshCertificateDetail();
    }, [getFreshCertificateDetail]);

    const { primaryAction, menuActions } = useMemo(() => {
        const isArchived = !!certificate?.archived;
        const noContent = certificate?.certificateContent ? undefined : 'The certificate has no content';
        const issuedBlocker = lifecycleBlocker(certificate, CertStatus.Issued);
        let complianceBlocker: string | undefined;
        if (isArchived) complianceBlocker = 'The certificate is archived';
        else if (!certificate?.raProfile) complianceBlocker = 'The certificate has no RA profile';
        else complianceBlocker = noContent;

        const download: PageAction = {
            id: 'download',
            label: 'Download',
            icon: 'download',
            ...blocked(noContent),
            onClick: onDownloadClick,
        };
        const rest: PageAction[] = [
            {
                id: 'issue',
                label: 'Issue',
                icon: 'cubes',
                ...blocked(lifecycleBlocker(certificate, CertStatus.Requested)),
                onClick: () =>
                    dispatch(
                        actions.issueCertificateNew({
                            certificateUuid: certificate?.uuid ?? '',
                            raProfileUuid: certificate?.raProfile?.uuid ?? '',
                            authorityUuid: certificate?.raProfile?.authorityInstanceUuid ?? '',
                        }),
                    ),
            },
            {
                id: 'renew',
                label: 'Renew',
                icon: 'retweet',
                ...blocked(issuedBlocker),
                onClick: () => {
                    attemptFailed.current = false;
                    setRenew(true);
                },
            },
            {
                id: 'rekey',
                label: 'Rekey',
                icon: 'rekey',
                ...blocked(issuedBlocker),
                onClick: () => {
                    attemptFailed.current = false;
                    setRekey(true);
                },
            },
            {
                id: 'complete',
                label: 'Complete',
                icon: 'check',
                ...blocked(completeBlocker(certificate)),
                onClick: () => setComplete(true),
            },
            { id: 'check-compliance', label: 'Check compliance', icon: 'gavel', ...blocked(complianceBlocker), onClick: onComplianceCheck },
            {
                id: 'copy',
                label: 'Copy certificate content',
                icon: 'copy',
                ...blocked(noContent),
                onClick: (anchor) =>
                    copyToClipboard(
                        formatPEM(certificate?.certificateContent ?? ''),
                        anchor,
                        'Failed to copy certificate content to clipboard',
                    ),
            },
            {
                id: 'archive',
                label: 'Archive',
                icon: 'archive',
                ...blocked(archiveBlocker(true, isArchived, isArchiving)),
                onClick: () => dispatch(actions.archiveCertificate({ uuid: certificate?.uuid ?? '' })),
            },
            {
                id: 'unarchive',
                label: 'Unarchive',
                icon: 'unarchive',
                ...blocked(archiveBlocker(false, isArchived, isArchiving)),
                onClick: () => dispatch(actions.unarchiveCertificate({ uuid: certificate?.uuid ?? '' })),
            },
            {
                id: 'revoke',
                label: 'Revoke',
                icon: 'minus-square',
                destructive: true,
                ...blocked(issuedBlocker),
                onClick: () => setRevoke(true),
            },
            { id: 'delete', label: 'Delete', icon: 'trash', destructive: true, onClick: () => setConfirmDelete(true) },
        ];
        return { primaryAction: download, menuActions: rest };
    }, [certificate, isArchiving, dispatch, onDownloadClick, onComplianceCheck, copyToClipboard]);

    return (
        <>
            <PageHeader breadcrumbs={breadcrumbs} primaryAction={primaryAction} actions={menuActions} />

            <Dialog
                isOpen={confirmDelete}
                caption="Delete Certificate"
                body="You are about to delete a Certificate. Is this what you want to do?"
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                buttons={[
                    { key: 'cancel', color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                    { key: 'delete', color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                ]}
            />

            <Dialog
                isOpen={renew}
                caption={`Renew Certificate`}
                body={
                    certificate ? (
                        <CertificateRenewDialog
                            certificate={certificate}
                            onCancel={onCloseRenew}
                            onDone={onRenewDone}
                            onRenew={onRenew}
                            onRegister={onRegisterSuccessor}
                            allowWithoutFile={certificate.privateKeyAvailability || false}
                        />
                    ) : null
                }
                toggle={onCloseRenew}
                buttons={[]}
                icon="refresh"
                size="xl"
            />

            <Dialog
                isOpen={rekey}
                caption={`Rekey Certificate`}
                body={
                    certificate ? (
                        <CertificateRekeyDialog
                            certificate={certificate}
                            onCancel={onCloseRekey}
                            onDone={onRekeyDone}
                            onRegister={onRegisterSuccessor}
                        />
                    ) : null
                }
                toggle={onCloseRekey}
                buttons={[]}
                icon="shuffle"
                size="xl"
            />

            <Dialog
                isOpen={revoke}
                caption={`Revoke Certificate`}
                body={certificate ? <CertificateRevokeDialog certificate={certificate} onClose={() => setRevoke(false)} /> : null}
                toggle={() => setRevoke(false)}
                icon="minus"
                buttons={[]}
                size="lg"
            />

            <Dialog
                isOpen={complete}
                caption="Complete Certificate Registration"
                body={certificate && <CompleteRegisteredDialog certificate={certificate} onCancel={onCloseCompleteRegistration} />}
                toggle={onCloseCompleteRegistration}
                buttons={[]}
                icon="check"
                size="lg"
            />
        </>
    );
}
