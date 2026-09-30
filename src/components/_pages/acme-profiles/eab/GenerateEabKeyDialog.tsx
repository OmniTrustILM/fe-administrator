import { backendClient } from 'src/api';
import CopyUrlCell from 'components/CopyUrlCell';
import Dialog from 'components/Dialog';
import Spinner from 'components/Spinner';
import SecretForm from 'components/_pages/secrets/form';
import { actions as alertActions } from 'ducks/alerts';
import { actions as secretsActions } from 'ducks/secrets';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { catchError, forkJoin, map, type Observable, of, type Subscription, switchMap } from 'rxjs';
import {
    type AcmeEabKeyDto,
    type ApprovalProfileDto,
    type CreateSecretRequest,
    Resource,
    type SecretDetailDto,
    type SecretDto,
    SecretType,
} from 'types/openapi';
import { EAB_CLIENT_HINT, EAB_KEY_NOTICE, EAB_SECRET_CREATED, EAB_SECRET_SELECTED, newEabSecretProblem } from 'utils/acme-eab';
import { extractError, extractErrorReason } from 'utils/net';

export type EabKeyApi = Readonly<{
    generateKey: () => Observable<AcmeEabKeyDto>;
    createSecret: (request: CreateSecretRequest) => Observable<SecretDetailDto>;
    enableSecret: (uuid: string) => Observable<void>;
    getSecret: (uuid: string) => Observable<SecretDetailDto>;
    vaultProfileApprovalProfiles: (vaultProfileUuid: string) => Observable<ApprovalProfileDto[]>;
}>;

const backendEabKeyApi: EabKeyApi = {
    generateKey: () => backendClient.acmeProfiles.generateEabKey(),
    createSecret: (request) => backendClient.secrets.createSecret(request),
    enableSecret: (uuid) => backendClient.secrets.enableSecret({ uuid }),
    getSecret: (uuid) => backendClient.secrets.getSecretDetails({ uuid }),
    vaultProfileApprovalProfiles: (vaultProfileUuid) =>
        backendClient.approvalProfiles.getAssociatedApprovalProfiles1({
            resource: Resource.VaultProfiles,
            associationObjectUuid: vaultProfileUuid,
        }),
};

type Props = Readonly<{
    isOpen: boolean;
    onClose: () => void;
    // A secret created here that can bind accounts right away; without it the operator is sent to edit the profile.
    onSelect?: (secret: SecretDto) => void;
    api?: EabKeyApi;
}>;

type Created = { secret: SecretDto; problem?: string };

// Not through epics: the key must not be kept in client state, and the store would keep it.
export default function GenerateEabKeyDialog({ isOpen, onClose, onSelect, api = backendEabKeyApi }: Props) {
    const dispatch = useDispatch();
    const [key, setKey] = useState<string>();
    const [isGenerating, setIsGenerating] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [created, setCreated] = useState<Created>();
    const creation = useRef<Subscription>(undefined);

    // Parents pass inline callbacks; regenerating on their identity would replace a key already shown.
    const onCloseRef = useRef(onClose);
    const onSelectRef = useRef(onSelect);
    const apiRef = useRef(api);
    onCloseRef.current = onClose;
    onSelectRef.current = onSelect;
    apiRef.current = api;

    useEffect(() => {
        if (!isOpen) {
            setKey(undefined);
            setCreated(undefined);
            setIsCreating(false);
            creation.current?.unsubscribe();
            return;
        }
        setIsGenerating(true);
        const subscription = apiRef.current.generateKey().subscribe({
            next: (dto) => {
                setKey(dto.key);
                setIsGenerating(false);
            },
            error: (err) => {
                setIsGenerating(false);
                dispatch(alertActions.error(extractError(err, 'Failed to generate External Account Binding key')));
                onCloseRef.current();
            },
        });
        return () => subscription.unsubscribe();
    }, [isOpen, dispatch]);

    useEffect(() => () => creation.current?.unsubscribe(), []);

    const preset = useMemo(() => (key ? { type: SecretType.SecretKey as const, content: key } : undefined), [key]);

    const createSecret = (request: CreateSecretRequest) => {
        const calls = apiRef.current;
        setIsCreating(true);
        creation.current = calls
            .createSecret(request)
            .pipe(
                // Core creates a secret disabled and settles its state only after replying, so it is read again once
                // enabled; while it is still inactive, the vault profile's approval profiles say whether it will be held.
                switchMap((secret) =>
                    forkJoin({
                        enable: calls.enableSecret(secret.uuid).pipe(
                            map(() => ({ enabled: true, enableError: undefined as string | undefined })),
                            catchError((err) => of({ enabled: false, enableError: extractErrorReason(err) })),
                        ),
                        needsApproval: calls.vaultProfileApprovalProfiles(request.vaultProfileUuid).pipe(
                            map((profiles) => profiles.length > 0),
                            catchError(() => of(undefined)),
                        ),
                    }).pipe(
                        switchMap((checks) =>
                            calls.getSecret(secret.uuid).pipe(
                                map((current) => ({ secret: current, stateRead: true, ...checks })),
                                catchError(() =>
                                    of({ secret: { ...secret, enabled: checks.enable.enabled }, stateRead: false, ...checks }),
                                ),
                            ),
                        ),
                    ),
                ),
            )
            .subscribe({
                next: ({ secret, stateRead, enable, needsApproval }) => {
                    const problem = newEabSecretProblem({
                        secret,
                        vaultProfileName: secret.sourceVaultProfile.name,
                        needsApproval,
                        enableError: enable.enableError,
                        stateRead,
                    });
                    setIsCreating(false);
                    setCreated({ secret, problem });
                    if (!problem) onSelectRef.current?.(secret);
                    // The listing read before this secret existed is what the form and the detail page name secrets from.
                    dispatch(secretsActions.listSecretOptions());
                },
                error: (err) => {
                    setIsCreating(false);
                    dispatch(alertActions.error(extractError(err, 'Failed to create Secret')));
                },
            });
    };

    // A close mid-creation would drop the key and the reply of a create that may already have gone through.
    const close = isCreating ? undefined : onClose;

    return (
        <Dialog
            isOpen={isOpen}
            toggle={close}
            caption="External Account Binding key"
            size="xl"
            dataTestId="generate-eab-key-dialog"
            body={
                <div className="space-y-4">
                    <Spinner active={isGenerating} />
                    {key ? (
                        <>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-content">HMAC key</p>
                                <div className="rounded-lg border border-divider bg-surface-sunken p-3 font-mono" data-testid="eab-key">
                                    <CopyUrlCell label="key">{key}</CopyUrlCell>
                                </div>
                            </div>
                            {created ? (
                                <>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-content">Key ID (kid)</p>
                                        <div
                                            className="rounded-lg border border-divider bg-surface-sunken p-3 font-mono"
                                            data-testid="eab-key-id"
                                        >
                                            <CopyUrlCell label="Key ID">{created.secret.uuid}</CopyUrlCell>
                                        </div>
                                    </div>
                                    <output
                                        className={created.problem ? 'block text-sm text-warning' : 'block text-sm text-success'}
                                        data-testid="eab-secret-outcome"
                                    >
                                        {created.problem ?? (onSelect ? EAB_SECRET_SELECTED : EAB_SECRET_CREATED)}
                                    </output>
                                    <p className="text-sm text-content-subtle" data-testid="eab-client-hint">
                                        {EAB_CLIENT_HINT}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <output className="block text-sm text-warning" data-testid="eab-key-notice">
                                        {EAB_KEY_NOTICE}
                                    </output>
                                    <SecretForm preset={preset} onCreate={createSecret} createInProgress={isCreating} onCancel={close} />
                                </>
                            )}
                        </>
                    ) : null}
                </div>
            }
            buttons={created ? [{ color: 'primary', body: 'Close', onClick: onClose }] : undefined}
        />
    );
}
