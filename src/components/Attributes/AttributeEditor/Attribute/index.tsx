import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { AddNewAttributeList, type AddNewAttributeType } from 'types/user-interface';
import {
    type CustomAttributeModel,
    type DataAttributeModel,
    type InfoAttributeModel,
    isCustomAttributeModel,
    isDataAttributeModel,
} from 'types/attributes';
import { AttributeContentType } from 'types/openapi';
import { actions as userInterfaceActions, selectors as userInterfaceSelectors } from '../../../../ducks/user-interface';
import { getAttributeContent } from '../../../../utils/attributes/attributes';
import { AttributeInfo } from './AttributeInfo';
import { AttributeFieldSelect } from './AttributeFieldSelect';
import { AttributeFieldFile } from './AttributeFieldFile';
import { AttributeFieldInput } from './AttributeFieldInput';

type Props = Readonly<{
    name: string;
    descriptor: DataAttributeModel | InfoAttributeModel | CustomAttributeModel | undefined;
    options?: { label: string; value: any }[];
    busy?: boolean;
    userInteractedRef?: React.MutableRefObject<boolean>;
    deleteButton?: React.ReactNode;
}>;

export function Attribute({
    name,
    descriptor,
    options,
    busy = false,
    userInteractedRef: userInteractionRef,
    deleteButton,
}: Props): React.ReactNode {
    const { setValue } = useFormContext<Record<string, any>>();
    const [addNewAttributeValue, setIsAddNewAttributeValue] = useState<AddNewAttributeType | undefined>();
    const attributeCallbackValue = useSelector(userInterfaceSelectors.selectAttributeCallbackValue);
    const initiateAttributeCallback = useSelector(userInterfaceSelectors.selectInitiateAttributeCallback);
    const dispatch = useDispatch();

    useEffect(() => {
        if (descriptor?.name) {
            const addNew = AddNewAttributeList.find((a) => a.contentType === descriptor.contentType);
            setIsAddNewAttributeValue(addNew);
        }
    }, [descriptor]);

    /* c8 ignore start */
    const handleAddNew = useCallback(() => {
        if (!addNewAttributeValue) return;
        dispatch(
            userInterfaceActions.showGlobalModal({
                content: addNewAttributeValue.content,
                isOpen: true,
                size: 'xl',
                title: `Add New ${addNewAttributeValue.name}`,
            }),
        );
    }, [dispatch, addNewAttributeValue]);

    const onUserInteraction = useCallback(() => {
        if (userInteractionRef) {
            userInteractionRef.current = true;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userInteractionRef, name]);

    const onFileLoaded = useCallback(
        (data: ProgressEvent<FileReader>, fileName: string) => {
            const fileInfo = data.target!.result as string;
            const contentType = fileInfo.split(',')[0].split(':')[1].split(';')[0];
            const fileContent = fileInfo.split(',')[1];
            setValue(`${name}.content`, fileContent, { shouldValidate: true, shouldDirty: true });
            setValue(`${name}.fileName`, fileName, { shouldDirty: true });
            setValue(`${name}.mimeType`, contentType, { shouldDirty: true });
        },
        [setValue, name],
    );

    const onFileChanged = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            if (!e.target.files || e.target.files.length === 0) return;
            const fileName = e.target.files[0].name;
            const reader = new FileReader();
            reader.readAsDataURL(e.target.files[0]);
            reader.onload = (data) => onFileLoaded(data, fileName);
        },
        [onFileLoaded],
    );

    const onFileDrop = useCallback(
        (e: React.DragEvent<HTMLInputElement>) => {
            e.preventDefault();
            if (!e.dataTransfer?.files?.length) return;
            const fileName = e.dataTransfer.files[0].name;
            const reader = new FileReader();
            reader.readAsDataURL(e.dataTransfer.files[0]);
            reader.onload = (data) => onFileLoaded(data, fileName);
        },
        [onFileLoaded],
    );

    const onFileDragOver = useCallback((e: React.DragEvent<HTMLInputElement>) => {
        e.preventDefault();
    }, []);

    useEffect(() => {
        if (initiateAttributeCallback && attributeCallbackValue && options) {
            const newOption = options.find((option) => option.label === attributeCallbackValue);
            if (newOption) {
                setValue(name, newOption, { shouldValidate: true });
                dispatch(userInterfaceActions.clearAttributeCallbackValue());
                dispatch(userInterfaceActions.setInitiateAttributeCallback(false));
            }
        }
    }, [attributeCallbackValue, dispatch, options, setValue, initiateAttributeCallback, name]);

    const handleSelectChangeMulti = useCallback(
        (fieldOnChange: (v: any) => void) => (newValue: any) => {
            if (Array.isArray(newValue) && newValue.some((v: any) => v.value === '__add_new__')) {
                handleAddNew();
                const filteredValue = newValue.filter((v: any) => v.value !== '__add_new__');
                fieldOnChange(filteredValue.length > 0 ? filteredValue : undefined);
                return;
            }
            fieldOnChange(newValue);
            onUserInteraction();
        },
        [handleAddNew, onUserInteraction],
    );

    const handleSelectChangeSingle = useCallback(
        (fieldOnChange: (v: any) => void) => (newValue: any) => {
            if (newValue === '__add_new__') {
                handleAddNew();
                return;
            }
            fieldOnChange(newValue);
            onUserInteraction();
        },
        [handleAddNew, onUserInteraction],
    );
    /* c8 ignore stop */

    if (!descriptor) return <></>;

    if (isDataAttributeModel(descriptor) || isCustomAttributeModel(descriptor)) {
        const shouldRenderSelect = descriptor.properties.list || descriptor.contentType === AttributeContentType.Resource;

        if (shouldRenderSelect) {
            return (
                <AttributeFieldSelect
                    name={name}
                    descriptor={descriptor}
                    options={options}
                    busy={busy}
                    deleteButton={deleteButton}
                    addNewAttributeValue={addNewAttributeValue ? { label: '+ Add new', value: '__add_new__' } : undefined}
                    onSelectChangeMulti={handleSelectChangeMulti}
                    onSelectChangeSingle={handleSelectChangeSingle}
                />
            );
        }
        if (descriptor.contentType === AttributeContentType.File) {
            return (
                <AttributeFieldFile
                    name={name}
                    descriptor={descriptor}
                    deleteButton={deleteButton}
                    onFileDrop={onFileDrop}
                    onFileDragOver={onFileDragOver}
                    onFileChanged={onFileChanged}
                />
            );
        }
        return <AttributeFieldInput name={name} descriptor={descriptor} busy={busy} deleteButton={deleteButton} />;
    }

    const infoDescriptor = descriptor as InfoAttributeModel;
    const rawContent = getAttributeContent(infoDescriptor.contentType, infoDescriptor.content);
    const content = typeof rawContent === 'string' ? rawContent : String(rawContent ?? '');

    return <AttributeInfo name={infoDescriptor.name} label={infoDescriptor.properties.label} content={content} />;
}
