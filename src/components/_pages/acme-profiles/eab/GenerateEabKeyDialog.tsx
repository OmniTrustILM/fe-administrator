import { backendClient } from 'src/api';
import CopyUrlCell from 'components/CopyUrlCell';
import Dialog from 'components/Dialog';
import Spinner from 'components/Spinner';
import SecretForm from 'components/_pages/secrets/form';
import { actions as alertActions } from 'ducks/alerts';
import { actions as secretsActions } from 'ducks/secrets';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import type { Observable, Subscription } from 'rxjs';
import type { CustomAttributeModel } from 'types/attributes';
import { type AcmeEabKeyDto, type CreateSecretRequest, type SecretDto, SecretType } from 'types/openapi';
import { EAB_CLIENT_HINT, EAB_KEY_NOTICE, EAB_SECRET_CREATED, EAB_SECRET_SELECTED, newEabSecretProblem } from 'utils/acme-eab';
import { extractError } from 'utils/net';
import { createAndEnableSecret, type SecretCreationApi } from 'utils/secret-creation';
import {
    backendSecretCreationApi,
    loadSecretAttributes,
    loadSecretCustomAttributes,
    type SecretAttributesLoader,
} from 'components/_pages/secrets/secretCreationApi';

export type EabKeyApi = SecretCreationApi &
    Readonly<{
        generateKey: () => Observable<AcmeEabKeyDto>;
        loadCustomAttributes: () => Observable<CustomAttributeModel[]>;
        loadSecretAttributes: SecretAttributesLoader;
    }>;

const backendEabKeyApi: EabKeyApi = {
    ...backendSecretCreationApi,
    generateKey: () => backendClient.acmeProfiles.generateEabKey(),
    loadCustomAttributes: loadSecretCustomAttributes,
    loadSecretAttributes,
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
    const [customAttributes, setCustomAttributes] = useState<CustomAttributeModel[]>([]);
    const [customAttributesLoading, setCustomAttributesLoading] = useState(true);
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

    // Loaded here, as the page beneath may show its own custom attributes from the store.
    useEffect(() => {
        if (!isOpen) return;
        setCustomAttributesLoading(true);
        const loading = apiRef.current.loadCustomAttributes().subscribe({
            next: (loaded) => {
                setCustomAttributes(loaded);
                setCustomAttributesLoading(false);
            },
            error: (err) => dispatch(alertActions.error(extractError(err, 'Failed to get Resource Custom Attributes list'))),
        });
        return () => loading.unsubscribe();
    }, [isOpen, dispatch]);

    const preset = useMemo(() => (key ? { type: SecretType.Generic as const, content: key } : undefined), [key]);

    const createSecret = (request: CreateSecretRequest) => {
        const calls = apiRef.current;
        setIsCreating(true);
        creation.current = createAndEnableSecret(calls, request).subscribe({
            next: ({ secret, stateRead, enableError, needsApproval }) => {
                const problem = newEabSecretProblem({
                    secret,
                    vaultProfileName: secret.sourceVaultProfile.name,
                    needsApproval,
                    enableError,
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
                                    <SecretForm
                                        preset={preset}
                                        onCreate={createSecret}
                                        createInProgress={isCreating}
                                        onCancel={close}
                                        customAttributeDescriptors={customAttributes}
                                        customAttributesLoading={customAttributesLoading}
                                        loadSecretAttributes={api.loadSecretAttributes}
                                    />
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
