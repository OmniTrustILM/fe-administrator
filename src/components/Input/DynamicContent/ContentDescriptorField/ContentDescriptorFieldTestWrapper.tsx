import * as ReactHookForm from 'react-hook-form';
import ContentDescriptorField from './index';
import type { AttributeContentType } from 'types/openapi';

export type ContentDescriptorFieldTestWrapperProps = Readonly<{
    isList: boolean;
    contentType: AttributeContentType;
    defaultContent?: unknown[];
    readOnly?: boolean;
    showSubmitButton?: boolean;
}>;

export function ContentDescriptorFieldTestWrapper({
    isList,
    contentType,
    defaultContent = [{ data: '' }],
    readOnly = false,
    showSubmitButton = false,
}: ContentDescriptorFieldTestWrapperProps) {
    const methods = ReactHookForm.useForm({
        defaultValues: {
            content: defaultContent,
            readOnly,
        },
        mode: 'onTouched',
    });
    const {
        formState: { isValid },
    } = methods;
    return (
        <ReactHookForm.FormProvider {...methods}>
            <ContentDescriptorField isList={isList} contentType={contentType} />
            {showSubmitButton && (
                <button type="submit" disabled={!isValid} data-testid="form-submit">
                    Submit
                </button>
            )}
        </ReactHookForm.FormProvider>
    );
}
