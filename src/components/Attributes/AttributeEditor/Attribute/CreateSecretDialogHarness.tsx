import GlobalModal from 'components/GlobalModal';
import { createEabSecretStore, type EabKeyApiBehaviour, stubEabKeyApi } from 'components/_pages/acme-profiles/eab/eabKeyFixture';
import { actions as userInterfaceActions } from 'ducks/user-interface';
import { isValidElement, type ReactNode, useMemo, useState } from 'react';
import { Subject } from 'rxjs';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import type { DataAttributeModel } from 'types/attributes';
import {
    AttributeContentType,
    AttributeResource,
    AttributeType,
    AttributeValueTarget,
    type CreateSecretRequest,
    SecretType,
} from 'types/openapi';
import type { AttributeSelectOption } from 'utils/attributes/attributes';
import { withProviders } from 'utils/test-helpers';
import { AttributeFieldSelect } from './AttributeFieldSelect';
import CreateSecretDialog from './CreateSecretDialog';
import type { SecretCreationApi } from 'utils/secret-creation';
import { useCreatedOptions } from './useCreatedOptions';

const FIELD = 'secret';

// What the first page of the picker's resource listing holds; the secret created here is not on it.
const listing = (name: string, uuid: string): AttributeSelectOption => ({
    label: name,
    value: { reference: name, data: { uuid, name, resource: 'secrets' } },
});

const LISTED = [listing('existing', 'existing-uuid')];

// A listed secret sharing the new one's name must not stand in for it.
const LISTED_WITH_SAME_NAME = [...LISTED, listing('new-secret', 'listed-uuid')];

function secretDescriptor(multiSelect: boolean, secretType: SecretType): DataAttributeModel {
    return {
        type: AttributeType.Data,
        name: FIELD,
        uuid: 'secret-attribute',
        contentType: AttributeContentType.Resource,
        properties: {
            label: 'Secret',
            required: false,
            readOnly: false,
            visible: true,
            list: false,
            multiSelect,
            resource: AttributeResource.Secrets,
        },
        attributeCallback: {
            mappings: [{ to: 'SECRET_TYPE.type', targets: [AttributeValueTarget.Filter], value: secretType }],
        },
    } as DataAttributeModel;
}

type PickerProps = Readonly<{ api: SecretCreationApi; multiSelect: boolean; listed: AttributeSelectOption[]; secretType: SecretType }>;

function SecretPicker({ api, multiSelect, listed, secretType }: PickerProps) {
    const descriptor = useMemo(() => secretDescriptor(multiSelect, secretType), [multiSelect, secretType]);
    const { options, select } = useCreatedOptions(FIELD, multiSelect, listed);
    const [isCreating, setIsCreating] = useState(false);
    const value = useWatch({ name: FIELD });
    const passThrough = (onChange: (v: unknown) => void) => (v: unknown) => onChange(v);

    return (
        <>
            <button type="button" data-testid="open" onClick={() => setIsCreating(true)}>
                Create new
            </button>
            {isCreating && <CreateSecretDialog descriptor={descriptor} onCreated={select} onClose={() => setIsCreating(false)} api={api} />}
            <pre data-testid="value">{JSON.stringify(value ?? null)}</pre>
            <AttributeFieldSelect
                name={FIELD}
                descriptor={descriptor}
                options={options}
                busy={false}
                onSelectChangeMulti={passThrough}
                onSelectChangeSingle={passThrough}
            />
        </>
    );
}

function PickerForm(props: PickerProps) {
    const methods = useForm();
    return (
        <FormProvider {...methods}>
            <SecretPicker {...props} />
        </FormProvider>
    );
}

// The global modal's content is a React element; it holds no secret content, so it is left out of the record.
const withoutElements = (_key: string, value: unknown) => (isValidElement(value) ? '[element]' : value);

// The content of the created secret, kept off the page for the spec to read with `page.evaluate`.
function recordCreatedContent(request: CreateSecretRequest) {
    const secret = request.secretRequestDto.secret;
    (globalThis as unknown as Record<string, unknown>).createdSecretContent = 'content' in secret ? secret.content : undefined;
}

function OpenParentButton({ content }: Readonly<{ content: ReactNode }>) {
    const dispatch = useDispatch();
    const open = () => dispatch(userInterfaceActions.showGlobalModal({ isOpen: true, size: 'xl', title: 'Create Credential', content }));
    return (
        <button type="button" data-testid="open-parent" onClick={open}>
            Open parent form
        </button>
    );
}

export default function CreateSecretDialogHarness({
    multiSelect = false,
    sameNameListed = false,
    holdCreate = false,
    inGlobalModal = false,
    secretType = SecretType.Generic,
    ...behaviour
}: EabKeyApiBehaviour &
    Readonly<{
        multiSelect?: boolean;
        sameNameListed?: boolean;
        // The create stays pending until the `resolve-create` button is clicked.
        holdCreate?: boolean;
        // The picker sits in a form already shown in the global modal, opened with the `open-parent` button.
        inGlobalModal?: boolean;
        secretType?: SecretType;
    }>) {
    const createGate = useMemo(() => new Subject<void>(), []);
    const [actions, setActions] = useState<string[]>([]);
    const store = useMemo(
        () =>
            createEabSecretStore({ onAction: (action) => setActions((current) => [...current, JSON.stringify(action, withoutElements)]) }),
        [],
    );
    // biome-ignore lint/correctness/useExhaustiveDependencies: one stub per mount
    const api = useMemo(() => stubEabKeyApi({ ...behaviour, createGate: holdCreate ? createGate : undefined }, recordCreatedContent), []);
    const picker = (
        <PickerForm api={api} multiSelect={multiSelect} listed={sameNameListed ? LISTED_WITH_SAME_NAME : LISTED} secretType={secretType} />
    );

    return withProviders(
        <div>
            <GlobalModal />
            {inGlobalModal && <OpenParentButton content={picker} />}
            <button type="button" data-testid="resolve-create" onClick={() => createGate.next()}>
                Resolve create
            </button>
            <pre data-testid="store-actions">{actions.join('\n')}</pre>
            {!inGlobalModal && picker}
        </div>,
        { store },
    );
}
