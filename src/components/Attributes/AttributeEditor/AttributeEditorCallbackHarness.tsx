import { type Middleware, configureStore } from '@reduxjs/toolkit';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as ReactHookForm from 'react-hook-form';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { testReducers, testInitialState } from 'ducks/test-reducers';
import type { AttributeDescriptorModel } from 'types/attributes';
import AttributeEditor from './index';

/**
 * Test harness for the NG (dependsOn) callback behaviour of AttributeEditor.
 *
 * It builds a real Redux store with a recording middleware that captures every
 * `connectors/callbackConnector` and `connectors/callbackResource` action and
 * renders them into the DOM (one node per dispatch, plus a serialised payload),
 * so Playwright can assert exactly which callbacks fired, in what order, and
 * with what payload. A small control panel drives form values via setValue to
 * simulate dependency changes, clears and cascades without going through slow,
 * flaky real inputs.
 *
 * `simulateSuccess` lets a test flip a callback's in-flight flag back off (as the
 * epic's callbackSuccess would), to exercise the per-callbackId gate releasing.
 */

type FormSetter = { name: string; value: unknown };

export type AttributeEditorCallbackHarnessProps = {
    id: string;
    attributeDescriptors: AttributeDescriptorModel[];
    groupAttributesCallbackAttributes?: AttributeDescriptorModel[];
    connectorUuid?: string;
    functionGroupCode?: string;
    kind?: string;
    /** Buttons that, when clicked, apply these form values via setValue. */
    actions?: { label: string; sets: FormSetter[] }[];
    /** Initial form values, under `__attributes__<id>__`. */
    initialValues?: Record<string, unknown>;
    /** Attribute name whose live form value is rendered into a probe node (for reset assertions). */
    watchField?: string;
};

function isCallbackAction(type: string): boolean {
    return type === 'connectors/callbackConnector' || type === 'connectors/callbackResource';
}

function HarnessInner({
    id,
    attributeDescriptors,
    groupAttributesCallbackAttributes = [],
    connectorUuid,
    functionGroupCode,
    kind,
    actions = [],
    watchField,
    recorded,
    onSimulateSuccess,
    bump,
}: Readonly<
    AttributeEditorCallbackHarnessProps & {
        recorded: { type: string; callbackId: string; payload: any }[];
        onSimulateSuccess: (callbackId: string) => void;
        bump: number;
    }
>) {
    const { setValue, control } = ReactHookForm.useFormContext<Record<string, any>>();
    void bump; // re-render is driven by the store subscription in the parent
    // Live value of an optional dependent control, surfaced to the DOM for reset assertions.
    const watchedValue = ReactHookForm.useWatch({ control, name: watchField ? `__attributes__${id}__.${watchField}` : '__noop__' });

    return (
        <>
            <div data-testid="controls">
                {actions.map((a) => (
                    <button
                        key={a.label}
                        type="button"
                        data-testid={`set-${a.label}`}
                        onClick={() => {
                            a.sets.forEach(({ name, value }) => {
                                setValue(`__attributes__${id}__.${name}`, value, { shouldValidate: true, shouldDirty: true });
                            });
                        }}
                    >
                        {a.label}
                    </button>
                ))}
                <button
                    type="button"
                    data-testid="resolve-all"
                    onClick={() => {
                        // Release every in-flight callback id (simulates callbackSuccess from the epic).
                        recorded.forEach((r) => {
                            onSimulateSuccess(r.callbackId);
                        });
                    }}
                >
                    resolve-all
                </button>
            </div>
            <div data-testid="callbacks">
                {recorded.map((r, i) => (
                    // append-only record; index is a stable key here
                    <div key={`${r.callbackId}:${i}`} data-testid="callback" data-callback-id={r.callbackId} data-type={r.type}>
                        {JSON.stringify(r.payload)}
                    </div>
                ))}
            </div>
            {watchField !== undefined && (
                <div data-testid="watched" data-empty={watchedValue === undefined || watchedValue === '' ? 'true' : 'false'}>
                    {watchedValue === undefined ? '<undefined>' : JSON.stringify(watchedValue)}
                </div>
            )}
            <AttributeEditor
                id={id}
                attributeDescriptors={attributeDescriptors}
                groupAttributesCallbackAttributes={groupAttributesCallbackAttributes}
                setGroupAttributesCallbackAttributes={() => {}}
                connectorUuid={connectorUuid}
                functionGroupCode={functionGroupCode as any}
                kind={kind}
            />
        </>
    );
}

export function AttributeEditorCallbackHarness(props: Readonly<AttributeEditorCallbackHarnessProps>) {
    const { id, initialValues } = props;

    const recordedRef = useRef<{ type: string; callbackId: string; payload: any }[]>([]);
    const [bump, setBump] = useState(0);

    const store = useMemo(() => {
        const recorder: Middleware = () => (next) => (action: any) => {
            if (action?.type && isCallbackAction(action.type)) {
                const callbackId = action.payload?.callbackId;
                recordedRef.current.push({ type: action.type, callbackId, payload: action.payload });
            }
            return next(action);
        };
        return configureStore({
            reducer: testReducers,
            preloadedState: testInitialState as any,
            middleware: (getDefault) => getDefault({ serializableCheck: false }).concat(recorder),
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Re-render whenever the store changes (every callback dispatch flips an
    // isRunningCallback flag), so the recorded list reflects late, debounced fires.
    useEffect(() => store.subscribe(() => setBump((n) => n + 1)), [store]);

    const methods = ReactHookForm.useForm({
        defaultValues: initialValues ? ({ [`__attributes__${id}__`]: initialValues } as Record<string, any>) : {},
    });

    const onSimulateSuccess = (callbackId: string) => {
        // Drive the slice as the epic's callbackSuccess would: clear the in-flight flag.
        store.dispatch({ type: 'connectors/callbackSuccess', payload: { callbackId, data: [] } });
    };

    return (
        <Provider store={store}>
            <MemoryRouter>
                <ReactHookForm.FormProvider {...methods}>
                    <HarnessInner {...props} recorded={recordedRef.current} onSimulateSuccess={onSimulateSuccess} bump={bump} />
                </ReactHookForm.FormProvider>
            </MemoryRouter>
        </Provider>
    );
}
