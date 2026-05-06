import React from 'react';
import * as ReactHookForm from 'react-hook-form';
import ContentValueField from './index';
import type { BaseAttributeContentModel, CustomAttributeModel } from 'types/attributes';

export type ContentValueFieldTestWrapperProps = Readonly<{
    id?: string;
    descriptor: CustomAttributeModel;
    initialContent?: BaseAttributeContentModel[];
    onSubmit?: (attributeUuid: string, content: BaseAttributeContentModel[]) => void;
}>;

function ContentValueFieldTestWrapper({ id, descriptor, initialContent, onSubmit = () => {} }: ContentValueFieldTestWrapperProps) {
    const methods = ReactHookForm.useForm({
        defaultValues: {
            [descriptor.name]: undefined,
        },
        mode: 'onTouched',
    });
    return (
        <ReactHookForm.FormProvider {...methods}>
            <ContentValueField id={id} descriptor={descriptor} initialContent={initialContent} onSubmit={onSubmit} />
        </ReactHookForm.FormProvider>
    );
}

export default ContentValueFieldTestWrapper;
