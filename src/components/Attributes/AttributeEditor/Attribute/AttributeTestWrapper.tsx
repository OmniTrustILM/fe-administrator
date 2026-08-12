import type React from 'react';
import { useRef, useState } from 'react';
import * as ReactHookForm from 'react-hook-form';
import { Provider, useSelector } from 'react-redux';
import { createMockStore } from 'utils/test-helpers';
import GlobalModal from 'components/GlobalModal';
import { selectors as userInterfaceSelectors } from 'ducks/user-interface';
import { Attribute } from './index';
import type { DataAttributeModel, InfoAttributeModel, CustomAttributeModel } from 'types/attributes';
import type { AttributeSelectOption } from 'utils/attributes/attributes';

export type AttributeTestWrapperProps = {
    name: string;
    descriptor: DataAttributeModel | InfoAttributeModel | CustomAttributeModel | undefined;
    options?: AttributeSelectOption[];
    busy?: boolean;
    userInteractedRef?: React.RefObject<boolean>;
    deleteButton?: React.ReactNode;
    defaultValues?: Record<string, unknown>;
    /** Preloaded store state (e.g. userInterface.initiateAttributeCallback) */
    preloadedState?: Record<string, unknown>;
    /**
     * Render the real GlobalModal. Turn this off for descriptors whose "Add new" content is a full
     * form (CredentialForm) that the no-op test reducers cannot satisfy — the probe below still
     * reports what Attribute dispatched.
     */
    renderGlobalModal?: boolean;
    /** Owns a userInteractedRef internally and mirrors it into the DOM for assertions. */
    probeUserInteracted?: boolean;
};

/** Surfaces the dispatched globalModal state so tests can assert it without rendering its content. */
function GlobalModalProbe() {
    const globalModal = useSelector(userInterfaceSelectors.selectGlobalModal);
    return <span data-testid="global-modal-state">{globalModal?.isOpen ? (globalModal.title ?? 'open') : 'closed'}</span>;
}

export function AttributeTestWrapper({
    name,
    descriptor,
    options,
    busy = false,
    userInteractedRef,
    deleteButton,
    defaultValues = {},
    preloadedState,
    renderGlobalModal = true,
    probeUserInteracted = false,
}: Readonly<AttributeTestWrapperProps>) {
    // Build the store once. Recreating it per render would throw away anything the component
    // dispatches (e.g. showGlobalModal) the moment that dispatch triggers a re-render.
    const [store] = useState(() => createMockStore(preloadedState));
    // Writing to a ref does not re-render, so the probe variant swaps in a ref-shaped object whose
    // setter also pushes the value into state — otherwise the mirrored span would stay stale.
    const [interacted, setInteracted] = useState(false);
    const interactedStorageRef = useRef(false);
    const [probeRef] = useState(() => ({
        get current() {
            return interactedStorageRef.current;
        },
        set current(value: boolean) {
            interactedStorageRef.current = value;
            setInteracted(value);
        },
    }));
    const effectiveInteractedRef = probeUserInteracted ? probeRef : userInteractedRef;
    const methods = ReactHookForm.useForm({
        defaultValues: {
            [name]: undefined,
            ...defaultValues,
        },
    });
    return (
        <Provider store={store}>
            {renderGlobalModal && <GlobalModal />}
            <GlobalModalProbe />
            {probeUserInteracted && <span data-testid="user-interacted">{String(interacted)}</span>}
            <ReactHookForm.FormProvider {...methods}>
                <Attribute
                    name={name}
                    descriptor={descriptor}
                    options={options}
                    busy={busy}
                    userInteractedRef={effectiveInteractedRef}
                    deleteButton={deleteButton}
                />
            </ReactHookForm.FormProvider>
        </Provider>
    );
}
