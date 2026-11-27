import type React from 'react';
import { useMemo, useState } from 'react';
import * as ReactHookForm from 'react-hook-form';
import { Provider } from 'react-redux';
import { actions as connectorActions } from 'ducks/connectors';
import { MemoryRouter } from 'react-router';
import { createMockStore } from 'utils/test-helpers';
import AttributeEditor from './index';
import type { AttributeDescriptorModel, AttributeResponseModel } from 'types/attributes';
import type { FunctionGroupCode } from 'types/openapi';

export type AttributeEditorTestWrapperProps = {
    id: string;
    attributeDescriptors: AttributeDescriptorModel[];
    attributes?: AttributeResponseModel[];
    groupAttributesCallbackAttributes?: AttributeDescriptorModel[];
    setGroupAttributesCallbackAttributes?: React.Dispatch<React.SetStateAction<AttributeDescriptorModel[]>>;
    connectorUuid?: string;
    functionGroupCode?: FunctionGroupCode;
    kind?: string;
    withRemoveAction?: boolean;
    preloadedState?: Record<string, unknown>;
    renderFormValues?: boolean;
    /** Renders a button that hands AttributeEditor the same descriptors under a new identity, the way a
     *  parent re-render or a resolved group callback does. */
    withDescriptorRefresh?: boolean;
    /** Keeps groupAttributesCallbackAttributes in wrapper state, the way a form page does, so the editor can
     *  add and remove callback-injected fields, and renders buttons that reset them the way a page does when its
     *  context changes (clearing all callback data and the injected fields) and that clear all callback data alone, as
     *  a page does when another of its editors changes context, and that replaces the editor with a new one on a fresh
     *  page in one render, as leaving a page and coming back to it does. */
    withGroupCallbackState?: boolean;
    /** Renders buttons that answer every callbackId, or one, with a deep copy of its data, as a response off the
     *  wire would be, standing in for the callback epic. */
    callbackResponses?: Record<string, unknown[]>;
    /** Renders a button that answers every callbackId with this data instead, as a later answer that differs from
     *  the first. */
    laterCallbackResponses?: Record<string, unknown[]>;
    /** Validates on change, as form pages do, and renders the form's validity. */
    renderFormValidity?: boolean;
    /** Renders a button that mounts a second editor with these descriptors in the same form and store, as pages with
     *  several editors do. */
    secondEditorDescriptors?: AttributeDescriptorModel[];
    /** Shows each group in a pane that folds. */
    collapsibleGroups?: boolean;
};

function FormValidityProbe() {
    const { isValid } = ReactHookForm.useFormState();
    return <span data-testid="form-valid">{String(isValid)}</span>;
}

function FormValuesProbe() {
    const values = ReactHookForm.useWatch();
    return <pre data-testid="form-values">{JSON.stringify(values)}</pre>;
}

/** Build form defaultValues so Data/Custom fields exist on first paint (before AttributeEditor effects run) */
function buildAttributeDefaultValues(
    id: string,
    attributeDescriptors: AttributeDescriptorModel[],
    attributes: AttributeResponseModel[],
): Record<string, unknown> {
    const key = `__attributes__${id}__`;
    const inner: Record<string, unknown> = {};
    for (const d of attributeDescriptors) {
        const attr = attributes.find((a) => a.name === d.name);
        const value = attr?.content?.[0]?.data ?? attr?.content?.[0]?.reference ?? '';
        inner[d.name] = value;
    }
    if (Object.keys(inner).length === 0) return {};
    return { [key]: inner };
}

// Stable defaults: a fresh array here would change prop identity on every wrapper render, which
// AttributeEditor's initial effect reads as "descriptors changed" and resets user-shown attributes.
const EMPTY_ATTRIBUTES: AttributeResponseModel[] = [];
const EMPTY_GROUP_CALLBACK_ATTRIBUTES: AttributeDescriptorModel[] = [];

export function AttributeEditorTestWrapper({
    id,
    attributeDescriptors,
    attributes = EMPTY_ATTRIBUTES,
    groupAttributesCallbackAttributes = EMPTY_GROUP_CALLBACK_ATTRIBUTES,
    setGroupAttributesCallbackAttributes,
    connectorUuid,
    functionGroupCode,
    kind,
    withRemoveAction = true,
    preloadedState,
    renderFormValues = false,
    withDescriptorRefresh = false,
    withGroupCallbackState = false,
    callbackResponses,
    laterCallbackResponses,
    renderFormValidity = false,
    secondEditorDescriptors,
    collapsibleGroups,
}: Readonly<AttributeEditorTestWrapperProps>) {
    const store = useMemo(() => createMockStore(preloadedState), [preloadedState]);
    const [refreshCount, setRefreshCount] = useState(0);
    const [secondEditorShown, setSecondEditorShown] = useState(false);
    const [editorKey, setEditorKey] = useState(0);
    const [groupCallbackState, setGroupCallbackState] = useState<AttributeDescriptorModel[]>(groupAttributesCallbackAttributes);
    const currentDescriptors = useMemo(
        () => (refreshCount === 0 ? attributeDescriptors : [...attributeDescriptors]),
        [attributeDescriptors, refreshCount],
    );
    const defaultValues = useMemo(
        () => ({ ...buildAttributeDefaultValues(id, attributeDescriptors, attributes) }),
        [id, attributeDescriptors, attributes],
    );
    const answerCallbacks = (callbackIds: string[], responses = callbackResponses) => {
        for (const callbackId of callbackIds) {
            const data = structuredClone(responses?.[callbackId] ?? []);
            store.dispatch(connectorActions.callbackSuccess({ callbackId, data }));
        }
    };
    const methods = ReactHookForm.useForm({
        defaultValues,
        mode: renderFormValidity ? 'onChange' : undefined,
    });
    return (
        <Provider store={store}>
            <MemoryRouter>
                <ReactHookForm.FormProvider {...methods}>
                    <AttributeEditor
                        key={editorKey}
                        id={id}
                        attributeDescriptors={currentDescriptors}
                        attributes={attributes}
                        groupAttributesCallbackAttributes={withGroupCallbackState ? groupCallbackState : groupAttributesCallbackAttributes}
                        setGroupAttributesCallbackAttributes={
                            withGroupCallbackState ? setGroupCallbackState : (setGroupAttributesCallbackAttributes ?? (() => {}))
                        }
                        connectorUuid={connectorUuid}
                        functionGroupCode={functionGroupCode}
                        kind={kind}
                        withRemoveAction={withRemoveAction}
                        collapsibleGroups={collapsibleGroups}
                    />
                    {withGroupCallbackState && (
                        <button
                            type="button"
                            data-testid="reset-callback-state"
                            onClick={() => {
                                store.dispatch(connectorActions.clearCallbackData());
                                setGroupCallbackState([]);
                            }}
                        >
                            Reset callback state
                        </button>
                    )}
                    {withGroupCallbackState && (
                        <button
                            type="button"
                            data-testid="leave-and-return"
                            onClick={() => {
                                setEditorKey((key) => key + 1);
                                setGroupCallbackState([]);
                            }}
                        >
                            Leave and return
                        </button>
                    )}
                    {withGroupCallbackState && (
                        <button
                            type="button"
                            data-testid="clear-callback-data"
                            onClick={() => store.dispatch(connectorActions.clearCallbackData())}
                        >
                            Clear callback data
                        </button>
                    )}
                    {withDescriptorRefresh && (
                        <button type="button" data-testid="refresh-descriptors" onClick={() => setRefreshCount((count) => count + 1)}>
                            Refresh descriptors
                        </button>
                    )}
                    {callbackResponses && (
                        <>
                            <button
                                type="button"
                                data-testid="answer-callbacks"
                                onClick={() => answerCallbacks(Object.keys(callbackResponses))}
                            >
                                Answer callbacks
                            </button>
                            {Object.keys(callbackResponses).map((callbackId) => (
                                <button
                                    key={callbackId}
                                    type="button"
                                    data-testid={`answer-callback-${callbackId}`}
                                    onClick={() => answerCallbacks([callbackId])}
                                >
                                    Answer {callbackId}
                                </button>
                            ))}
                        </>
                    )}
                    {laterCallbackResponses && (
                        <button
                            type="button"
                            data-testid="answer-later-callbacks"
                            onClick={() => answerCallbacks(Object.keys(laterCallbackResponses), laterCallbackResponses)}
                        >
                            Answer callbacks again
                        </button>
                    )}
                    {secondEditorDescriptors && (
                        <button type="button" data-testid="show-second-editor" onClick={() => setSecondEditorShown(true)}>
                            Show second editor
                        </button>
                    )}
                    {secondEditorDescriptors && secondEditorShown && (
                        <AttributeEditor
                            id="secondEditor"
                            attributeDescriptors={secondEditorDescriptors}
                            connectorUuid={connectorUuid}
                            kind={kind}
                        />
                    )}
                    {renderFormValues && <FormValuesProbe />}
                    {renderFormValidity && <FormValidityProbe />}
                </ReactHookForm.FormProvider>
            </MemoryRouter>
        </Provider>
    );
}
