import { useState } from 'react';
import { emptyAuthoringForm, type RequestAttributeAuthoringFormValues } from 'utils/requestAttributeAuthoring';
import RequestAttributeAuthoringEditor from './RequestAttributeAuthoringEditor';

type Props = Readonly<{
    initialValue?: RequestAttributeAuthoringFormValues;
    showMergeMode?: boolean;
    disabled?: boolean;
    connectorAttributeOptions?: { value: string; label: string }[];
}>;

/** Stateful wrapper so Playwright CT can exercise the controlled editor end-to-end. */
export default function RequestAttributeAuthoringEditorHarness({
    initialValue,
    showMergeMode,
    disabled,
    connectorAttributeOptions,
}: Props) {
    const [value, setValue] = useState<RequestAttributeAuthoringFormValues>(initialValue ?? emptyAuthoringForm());
    return (
        <div>
            <RequestAttributeAuthoringEditor
                value={value}
                onChange={setValue}
                showMergeMode={showMergeMode}
                disabled={disabled}
                connectorAttributeOptions={connectorAttributeOptions}
            />
            <pre data-testid="value-json">{JSON.stringify(value)}</pre>
        </div>
    );
}
