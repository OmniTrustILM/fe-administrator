import type React from 'react';
import { useEffect } from 'react';
import * as ReactHookForm from 'react-hook-form';
import { AttributeFieldFile } from './AttributeFieldFile';
import type { DataAttributeModel } from 'types/attributes';

export type AttributeFieldFileTestWrapperProps = {
    name: string;
    descriptor: DataAttributeModel;
    deleteButton?: React.ReactNode;
    onFileDrop: (e: React.DragEvent<HTMLInputElement>) => void;
    onFileDragOver: (e: React.DragEvent<HTMLInputElement>) => void;
    onFileChanged: (e: React.ChangeEvent<HTMLInputElement>) => void;
    mode?: ReactHookForm.Mode;
    validateOnMount?: boolean;
    withSubmit?: boolean;
    withNextField?: boolean;
};

export function AttributeFieldFileTestWrapper({
    name,
    descriptor,
    deleteButton,
    onFileDrop,
    onFileDragOver,
    onFileChanged,
    mode,
    validateOnMount = false,
    withSubmit = false,
    withNextField = false,
}: Readonly<AttributeFieldFileTestWrapperProps>) {
    const methods = ReactHookForm.useForm({
        mode,
        defaultValues: {
            [name]: { content: '', fileName: '', mimeType: '' },
        },
    });
    useEffect(() => {
        if (validateOnMount) void methods.trigger(`${name}.content`);
    }, [validateOnMount, methods, name]);

    const field = (
        <AttributeFieldFile
            name={name}
            descriptor={descriptor}
            deleteButton={deleteButton}
            onFileDrop={onFileDrop}
            onFileDragOver={onFileDragOver}
            onFileChanged={onFileChanged}
        />
    );

    return (
        <ReactHookForm.FormProvider {...methods}>
            {withSubmit ? (
                <form onSubmit={methods.handleSubmit(() => {})}>
                    {field}
                    <button type="submit">Submit</button>
                </form>
            ) : (
                <>
                    {field}
                    {withNextField && <input aria-label="Next field" />}
                </>
            )}
        </ReactHookForm.FormProvider>
    );
}
