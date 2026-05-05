import type React from 'react';
import * as ReactHookForm from 'react-hook-form';
import { AttributeFieldFile } from './AttributeFieldFile';
import type { DataAttributeModel } from 'types/attributes';

export type AttributeFieldFileTestWrapperProps = Readonly<{
    name: string;
    descriptor: DataAttributeModel;
    deleteButton?: React.ReactNode;
    onFileDrop: (e: React.DragEvent<HTMLInputElement>) => void;
    onFileDragOver: (e: React.DragEvent<HTMLInputElement>) => void;
    onFileChanged: (e: React.ChangeEvent<HTMLInputElement>) => void;
}>;

export function AttributeFieldFileTestWrapper({
    name,
    descriptor,
    deleteButton,
    onFileDrop,
    onFileDragOver,
    onFileChanged,
}: AttributeFieldFileTestWrapperProps) {
    const methods = ReactHookForm.useForm({
        defaultValues: {
            [name]: { content: '', fileName: '', mimeType: '' },
        },
    });
    return (
        <ReactHookForm.FormProvider {...methods}>
            <AttributeFieldFile
                name={name}
                descriptor={descriptor}
                deleteButton={deleteButton}
                onFileDrop={onFileDrop}
                onFileDragOver={onFileDragOver}
                onFileChanged={onFileChanged}
            />
        </ReactHookForm.FormProvider>
    );
}
