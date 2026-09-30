import { useMemo, useState } from 'react';
import { Subject } from 'rxjs';
import type { CreateSecretRequest, SecretDto } from 'types/openapi';
import { withProviders } from 'utils/test-helpers';
import { createEabSecretStore, type EabKeyApiBehaviour, stubEabKeyApi, VAULT_PATH_ATTRIBUTE } from './eabKeyFixture';
import GenerateEabKeyDialog from './GenerateEabKeyDialog';

type Props = EabKeyApiBehaviour &
    Readonly<{
        // The detail page opens the dialog without a field to select the secret in.
        selectable?: boolean;
        vaultProfileHasAttribute?: boolean;
        attributesLoading?: boolean;
        // The create stays pending until the `resolve-create` button is clicked.
        holdCreate?: boolean;
    }>;

export default function GenerateEabKeyDialogHarness({
    selectable = true,
    vaultProfileHasAttribute = false,
    attributesLoading = false,
    holdCreate = false,
    ...behaviour
}: Props) {
    const createGate = useMemo(() => new Subject<void>(), []);
    const [isOpen, setIsOpen] = useState(false);
    const [renders, setRenders] = useState(0);
    const [requests, setRequests] = useState<CreateSecretRequest[]>([]);
    const [selected, setSelected] = useState<SecretDto[]>([]);
    const [actions, setActions] = useState<unknown[]>([]);
    // biome-ignore lint/correctness/useExhaustiveDependencies: one store per mount
    const store = useMemo(
        () =>
            createEabSecretStore({
                vaultAttributes: vaultProfileHasAttribute ? [VAULT_PATH_ATTRIBUTE] : [],
                attributesLoading,
                onAction: (action) => setActions((current) => [...current, action]),
            }),
        [],
    );
    // biome-ignore lint/correctness/useExhaustiveDependencies: one stub per mount, so its generation count survives re-renders
    const api = useMemo(
        () =>
            stubEabKeyApi({ ...behaviour, createGate: holdCreate ? createGate : undefined }, (request) =>
                setRequests((current) => [...current, request]),
            ),
        [],
    );

    return withProviders(
        <div>
            <button type="button" data-testid="open" onClick={() => setIsOpen(true)}>
                Open
            </button>
            <span data-testid="state">{isOpen ? 'open' : 'closed'}</span>
            <button type="button" data-testid="rerender" data-renders={renders} onClick={() => setRenders((count) => count + 1)}>
                Rerender
            </button>
            <button type="button" data-testid="resolve-create" onClick={() => createGate.next()}>
                Resolve create
            </button>
            <pre data-testid="create-requests">{JSON.stringify(requests)}</pre>
            <pre data-testid="store-actions">{JSON.stringify(actions)}</pre>
            <pre data-testid="selected">{JSON.stringify(selected.map((secret) => ({ uuid: secret.uuid, enabled: secret.enabled })))}</pre>
            <GenerateEabKeyDialog
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                onSelect={selectable ? (secret) => setSelected((current) => [...current, secret]) : undefined}
                api={api}
            />
        </div>,
        { store },
    );
}
