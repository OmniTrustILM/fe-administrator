import { useRef, useState } from 'react';
import type { OidSelectOption } from 'utils/oid';
import { emptyAuthoringForm, type RequestAttributeAuthoringFormValues } from 'utils/requestAttributeAuthoring';
import RequestAttributeAuthoringEditor from './RequestAttributeAuthoringEditor';
import type { KeyUsageOption } from './useKeyUsageOptions';

type Props = Readonly<{
    initialValue?: RequestAttributeAuthoringFormValues;
    showMergeMode?: boolean;
    showBindings?: boolean;
    disabled?: boolean;
    connectorAttributeOptions?: { value: string; label: string; description?: string }[];
    rdnOptions?: OidSelectOption[];
    extensionOptions?: OidSelectOption[];
    extendedKeyUsageOptions?: OidSelectOption[];
    keyUsageOptions?: KeyUsageOption[];
    rdnOptionsError?: boolean;
    extensionOptionsError?: boolean;
    extendedKeyUsageOptionsError?: boolean;
    rdnOptionsLoaded?: boolean;
    extensionOptionsLoaded?: boolean;
    extendedKeyUsageOptionsLoaded?: boolean;
    /**
     * Simulates the auto-saving parents' persistence: every onChange starts a short pending window
     * that resolves to success, or to the given error message with the change rolled back, the way
     * the real pages revert a rejected save.
     */
    simulatePersist?: { failWith?: string };
}>;

/** Stateful wrapper so Playwright CT can exercise the controlled editor end-to-end. */
export default function RequestAttributeAuthoringEditorHarness({
    initialValue,
    showMergeMode,
    showBindings,
    disabled,
    connectorAttributeOptions,
    rdnOptions,
    extensionOptions,
    extendedKeyUsageOptions,
    keyUsageOptions,
    rdnOptionsError,
    extensionOptionsError,
    extendedKeyUsageOptionsError,
    rdnOptionsLoaded,
    extensionOptionsLoaded,
    extendedKeyUsageOptionsLoaded,
    simulatePersist,
}: Props) {
    const [value, setValue] = useState<RequestAttributeAuthoringFormValues>(initialValue ?? emptyAuthoringForm());
    const [persist, setPersist] = useState<{ pending: boolean; error?: string } | undefined>(
        simulatePersist ? { pending: false } : undefined,
    );
    const persisted = useRef(value);

    const onChange = (next: RequestAttributeAuthoringFormValues) => {
        setValue(next);
        if (!simulatePersist) return;
        setPersist({ pending: true });
        setTimeout(() => {
            if (simulatePersist.failWith) {
                setValue(persisted.current);
                setPersist({ pending: false, error: simulatePersist.failWith });
            } else {
                persisted.current = next;
                setPersist({ pending: false });
            }
        }, 100);
    };

    return (
        <div>
            <RequestAttributeAuthoringEditor
                value={value}
                onChange={onChange}
                showMergeMode={showMergeMode}
                showBindings={showBindings}
                disabled={disabled}
                connectorAttributeOptions={connectorAttributeOptions}
                rdnOptions={rdnOptions}
                extensionOptions={extensionOptions}
                extendedKeyUsageOptions={extendedKeyUsageOptions}
                keyUsageOptions={keyUsageOptions}
                rdnOptionsError={rdnOptionsError}
                extensionOptionsError={extensionOptionsError}
                extendedKeyUsageOptionsError={extendedKeyUsageOptionsError}
                rdnOptionsLoaded={rdnOptionsLoaded}
                extensionOptionsLoaded={extensionOptionsLoaded}
                extendedKeyUsageOptionsLoaded={extendedKeyUsageOptionsLoaded}
                persist={persist}
            />
            <pre data-testid="value-json">{JSON.stringify(value)}</pre>
        </div>
    );
}
