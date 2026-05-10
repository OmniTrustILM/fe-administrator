import type React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import Label from 'components/Label';
import TextInput from 'components/TextInput';
import cn from 'classnames';
import type { CustomAttributeModel, DataAttributeModel } from 'types/attributes';
import { buildAttributeValidators } from './attributeHelpers';

type AttributeFieldFileProps = {
    name: string;
    descriptor: DataAttributeModel | CustomAttributeModel;
    deleteButton?: React.ReactNode;
    onFileDrop: (e: React.DragEvent<HTMLInputElement>) => void;
    onFileDragOver: (e: React.DragEvent<HTMLInputElement>) => void;
    onFileChanged: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export function AttributeFieldFile({
    name,
    descriptor,
    deleteButton,
    onFileDrop,
    onFileDragOver,
    onFileChanged,
}: Readonly<AttributeFieldFileProps>): React.ReactNode {
    const { control } = useFormContext<Record<string, any>>();

    return (
        <>
            {descriptor.properties.visible && (
                <Label htmlFor={`${name}-content`} required={descriptor.properties.required}>
                    {descriptor.properties.label}
                </Label>
            )}

            {descriptor.properties.visible && (
                <section
                    id={`${name}-dragAndDrop`}
                    aria-label="File drop zone"
                    className="border-2 border-dashed border-gray-200 rounded-lg p-4 dark:border-neutral-700"
                    style={{ display: 'flex', flexWrap: 'wrap' }}
                    onDrop={onFileDrop}
                    onDragOver={onFileDragOver}
                >
                    <div className="flex-grow">
                        <Label htmlFor={`${name}-content`}>File content</Label>

                        <Controller
                            name={`${name}.content`}
                            control={control}
                            rules={{ validate: buildAttributeValidators(descriptor) }}
                            render={({ field, fieldState }) => (
                                <>
                                    <input
                                        {...field}
                                        id={`${name}-content`}
                                        type={descriptor.properties.visible ? 'text' : 'hidden'}
                                        placeholder={`Select or drag & drop ${descriptor.properties.label} File`}
                                        readOnly
                                        className={cn(
                                            'py-2.5 sm:py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600',
                                            {
                                                'border-red-500 focus:border-red-500 focus:ring-red-500':
                                                    fieldState.isTouched && fieldState.invalid,
                                            },
                                        )}
                                    />

                                    {fieldState.isTouched && fieldState.invalid && (
                                        <div className="mt-1 text-sm text-red-600">
                                            {typeof fieldState.error === 'string' ? fieldState.error : fieldState.error?.message}
                                        </div>
                                    )}
                                </>
                            )}
                        />

                        {descriptor.description && (
                            <p className="text-xs text-gray-400 mt-1 dark:text-neutral-400">{descriptor.description}</p>
                        )}
                    </div>
                    <div className="w-52 ml-4">
                        <Label htmlFor={`${name}-mimeType`}>Content type</Label>
                        <Controller
                            name={`${name}.mimeType`}
                            control={control}
                            render={({ field }) => (
                                <TextInput
                                    {...field}
                                    id={`${name}-mimeType`}
                                    type="text"
                                    placeholder="File not selected"
                                    disabled
                                    value={field.value || ''}
                                    onChange={() => {}}
                                    className="text-center"
                                />
                            )}
                        />
                    </div>
                    <div className="w-40 ml-4">
                        <Label htmlFor={`${name}-fileName`}>File name</Label>
                        <Controller
                            name={`${name}.fileName`}
                            control={control}
                            render={({ field }) => (
                                <TextInput
                                    {...field}
                                    id={`${name}-fileName`}
                                    type="text"
                                    placeholder="File not selected"
                                    disabled
                                    value={field.value || ''}
                                    onChange={() => {}}
                                    className="text-center"
                                />
                            )}
                        />
                    </div>
                    <div className="ml-4 flex items-center">
                        <label
                            htmlFor={name}
                            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-lg hover:bg-gray-50 cursor-pointer dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                        >
                            Select file...
                        </label>
                        <input id={name} type="file" className="hidden" onChange={onFileChanged} />
                    </div>
                    <div className="w-full h-0"></div>
                    <div className="text-sm text-gray-400 text-center w-full mt-4 dark:text-neutral-400">
                        Select or Drag &amp; Drop file to Drop Zone.
                    </div>
                    {deleteButton}
                </section>
            )}
        </>
    );
}
