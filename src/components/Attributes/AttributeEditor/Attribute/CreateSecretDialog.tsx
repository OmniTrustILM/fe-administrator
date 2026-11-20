import Dialog from 'components/Dialog';
import SecretForm from 'components/_pages/secrets/form';
import {
    backendSecretCreationApi,
    loadSecretCustomAttributes,
    type SecretAttributesLoader,
} from 'components/_pages/secrets/secretCreationApi';
import { actions as alertActions } from 'ducks/alerts';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import type { Observable, Subscription } from 'rxjs';
import type { CustomAttributeModel, DataAttributeModel } from 'types/attributes';
import { AttributeResource, type CreateSecretRequest, type SecretDto } from 'types/openapi';
import type { AttributeSelectOption } from 'utils/attributes/attributes';
import { allowedSecretTypes } from 'utils/attributes/secretPicker';
import { extractError } from 'utils/net';
import { createAndEnableSecret, type SecretCreationApi, type SecretUnusableReason, secretUnusableReason } from 'utils/secret-creation';

const NOT_SELECTABLE: Record<Exclude<SecretUnusableReason, 'disabled'>, string> = {
    awaitingApproval: 'Secret created; it awaits approval and cannot be selected yet',
    storeFailed: 'Secret created; storing it in its vault failed and it cannot be selected',
    rejected: 'Secret created; its vault profile rejected it and it cannot be selected',
    notReadBack: 'Secret created; it could not be read back and is not selected',
    approvalUnchecked: 'Secret created; whether it awaits approval could not be checked, so it is not selected',
};

function notSelectableMessage(reason: SecretUnusableReason, enableError: string | undefined): string {
    if (reason !== 'disabled') return NOT_SELECTABLE[reason];
    const cause = enableError ? ` (${enableError})` : '';
    return `Secret created; it could not be enabled${cause} and cannot be selected yet`;
}

// Matches what Core lists for a secret resource attribute.
function secretOption(secret: Pick<SecretDto, 'uuid' | 'name'>): AttributeSelectOption {
    return {
        label: secret.name,
        value: { reference: secret.name, data: { uuid: secret.uuid, name: secret.name, resource: AttributeResource.Secrets } },
    };
}

type Props = Readonly<{
    descriptor: DataAttributeModel;
    onCreated: (option: AttributeSelectOption) => void;
    onClose: () => void;
    api?: SecretCreationApi;
    loadCustomAttributes?: () => Observable<CustomAttributeModel[]>;
    loadSecretAttributes?: SecretAttributesLoader;
}>;

// Creates through the api rather than the store, so the secret content never reaches client state. A dialog of its own,
// so a form the picker belongs to stays open beneath it, even one shown in the global modal. Its custom attributes are
// loaded here, as that form may show its own from the store.
export default function CreateSecretDialog({
    descriptor,
    onCreated,
    onClose,
    api = backendSecretCreationApi,
    loadCustomAttributes = loadSecretCustomAttributes,
    loadSecretAttributes,
}: Props) {
    const dispatch = useDispatch();
    const [isCreating, setIsCreating] = useState(false);
    const [problem, setProblem] = useState<string>();
    const [customAttributes, setCustomAttributes] = useState<CustomAttributeModel[]>([]);
    const creation = useRef<Subscription>(undefined);

    useEffect(() => () => creation.current?.unsubscribe(), []);

    // biome-ignore lint/correctness/useExhaustiveDependencies: loaded once per dialog
    useEffect(() => {
        const loading = loadCustomAttributes().subscribe({
            next: setCustomAttributes,
            error: (err) => dispatch(alertActions.error(extractError(err, 'Failed to get Resource Custom Attributes list'))),
        });
        return () => loading.unsubscribe();
    }, []);

    const preset = useMemo(() => {
        const allowedTypes = allowedSecretTypes(descriptor);
        return { type: allowedTypes[0], allowedTypes };
    }, [descriptor]);

    const create = (request: CreateSecretRequest) => {
        setIsCreating(true);
        creation.current = createAndEnableSecret(api, request).subscribe({
            next: (created) => {
                setIsCreating(false);
                const reason = secretUnusableReason(created);
                if (reason) {
                    setProblem(notSelectableMessage(reason, created.enableError));
                    return;
                }
                onCreated(secretOption(created.secret));
                onClose();
            },
            error: (err) => {
                setIsCreating(false);
                dispatch(alertActions.error(extractError(err, 'Failed to create Secret')));
            },
        });
    };

    // Closing mid-create would drop the outcome of a create that may already have gone through.
    const close = isCreating ? undefined : onClose;

    return (
        <Dialog
            isOpen
            toggle={close}
            caption="Create Secret"
            size="xl"
            dataTestId="create-secret-dialog"
            body={
                problem ? (
                    <output className="block text-sm text-warning" data-testid="create-secret-outcome">
                        {problem}
                    </output>
                ) : (
                    <SecretForm
                        preset={preset}
                        onCreate={create}
                        createInProgress={isCreating}
                        onCancel={close}
                        customAttributeDescriptors={customAttributes}
                        loadSecretAttributes={loadSecretAttributes}
                    />
                )
            }
            buttons={problem ? [{ color: 'primary', body: 'Close', onClick: onClose }] : undefined}
        />
    );
}
