import { useState } from 'react';
import { emptyAuthoringForm, type RequestAttributeAuthoringFormValues } from 'utils/requestAttributeAuthoring';
import RequestAttributeAuthoringEditor, { type OidSelectOption } from './RequestAttributeAuthoringEditor';

type Props = Readonly<{
    initialValue?: RequestAttributeAuthoringFormValues;
    showMergeMode?: boolean;
    showBindings?: boolean;
    disabled?: boolean;
    connectorAttributeOptions?: { value: string; label: string; description?: string }[];
    rdnOptions?: OidSelectOption[];
    extensionOptions?: OidSelectOption[];
    rdnOptionsError?: boolean;
    extensionOptionsError?: boolean;
    rdnOptionsLoaded?: boolean;
    extensionOptionsLoaded?: boolean;
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
    rdnOptionsError,
    extensionOptionsError,
    rdnOptionsLoaded,
    extensionOptionsLoaded,
}: Props) {
    const [value, setValue] = useState<RequestAttributeAuthoringFormValues>(initialValue ?? emptyAuthoringForm());
    return (
        <div>
            <RequestAttributeAuthoringEditor
                value={value}
                onChange={setValue}
                showMergeMode={showMergeMode}
                showBindings={showBindings}
                disabled={disabled}
                connectorAttributeOptions={connectorAttributeOptions}
                rdnOptions={rdnOptions}
                extensionOptions={extensionOptions}
                rdnOptionsError={rdnOptionsError}
                extensionOptionsError={extensionOptionsError}
                rdnOptionsLoaded={rdnOptionsLoaded}
                extensionOptionsLoaded={extensionOptionsLoaded}
            />
            <pre data-testid="value-json">{JSON.stringify(value)}</pre>
        </div>
    );
}
