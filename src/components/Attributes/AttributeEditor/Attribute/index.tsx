import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { findAddNewAttribute } from '../../../../utils/attributes/secretPicker';
import { actions as userInterfaceActions, selectors as userInterfaceSelectors } from '../../../../ducks/user-interface';
import { type AttributeSelectOption, blankFile, getAttributeContent } from '../../../../utils/attributes/attributes';
import { AttributeInfo } from './AttributeInfo';
import { AttributeFieldSelect } from './AttributeFieldSelect';
import { AttributeFieldFile } from './AttributeFieldFile';
import { AttributeFieldInput } from './AttributeFieldInput';
import { useCreatedOptions } from './useCreatedOptions';

type Props = {
    name: string;
    descriptor: DataAttributeModel | InfoAttributeModel | CustomAttributeModel | undefined;
    options?: AttributeSelectOption[];
    busy?: boolean;
    userInteractedRef?: React.RefObject<boolean>;
    deleteButton?: React.ReactNode;
};

export function Attribute({
    name,
    descriptor,
    options,
    busy = false,
    userInteractedRef: userInteractionRef,
    deleteButton,
}: Readonly<Props>): React.ReactNode {
    const { setValue, setFocus } = useFormContext();
    const [addNewAttributeValue, setAddNewAttributeValue] = useState<AddNewAttributeType | undefined>();
    const [isAddingNew, setIsAddingNew] = useState(false);
    const attributeCallbackValue = useSelector(userInterfaceSelectors.selectAttributeCallbackValue);
    const initiateAttributeCallback = useSelector(userInterfaceSelectors.selectInitiateAttributeCallback);
    const dispatch = useDispatch();
    const { options: pickerOptions, select: selectCreated } = useCreatedOptions(
        name,
        !!descriptor && isDataAttributeModel(descriptor) && descriptor.properties.multiSelect,
        options,
    );

    useEffect(() => {
        if (descriptor?.name) {
            setAddNewAttributeValue(findAddNewAttribute(descriptor, AddNewAttributeList));
        }
    }, [descriptor]);

    /* c8 ignore start */
    const handleAddNew = useCallback(() => {
        if (!addNewAttributeValue) return;
        // The picker may sit in a form shown in the global modal, which only a dialog of its own leaves in place.
        if (typeof addNewAttributeValue.content === 'function') {
            setIsAddingNew(true);
            return;
        }
        dispatch(
            userInterfaceActions.showGlobalModal({
                content: addNewAttributeValue.content,
                isOpen: true,
                size: 'xl',
                title: `Create ${addNewAttributeValue.name}`,
            }),
        );
    }, [dispatch, addNewAttributeValue]);

    const closeAddNew = useCallback(() => setIsAddingNew(false), []);

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

    // Only the latest read writes the form. A read that Clear or a newer pick overtook is dropped.
    const activeReaderRef = useRef<FileReader>(undefined);

    const readFile = useCallback(
        (file: File) => {
            const reader = new FileReader();
            activeReaderRef.current = reader;
            reader.onload = (data) => {
                if (activeReaderRef.current === reader) onFileLoaded(data, file.name);
            };
            reader.readAsDataURL(file);
        },
        [onFileLoaded],
    );

    const onFileChanged = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            if (!e.target.files || e.target.files.length === 0) return;
            const file = e.target.files[0];
            // The browser fires a change only when the selection differs. An empty input lets the same file be picked again after Clear.
            e.target.value = '';
            readFile(file);
        },
        [readFile],
    );

    const onFileCleared = useCallback(() => {
        activeReaderRef.current = undefined;
        setValue(name, blankFile, { shouldValidate: true, shouldDirty: true });
        setFocus(`${name}.content`);
    }, [setValue, setFocus, name]);

    const onFileDrop = useCallback(
        (e: React.DragEvent<HTMLInputElement>) => {
            e.preventDefault();
            if (!e.dataTransfer?.files?.length) return;
            readFile(e.dataTransfer.files[0]);
        },
        [readFile],
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
        (fieldOnChange: (v: unknown) => void) => (newValue: unknown) => {
            const selected: unknown[] = Array.isArray(newValue) ? newValue : [];
            const toRawValue = (v: unknown) => (v && typeof v === 'object' && 'value' in v ? (v as { value: unknown }).value : v);
            const rawValues = selected.map(toRawValue);
            fieldOnChange(rawValues.length > 0 ? rawValues : undefined);
            onUserInteraction();
        },
        [onUserInteraction],
    );

    const handleSelectChangeSingle = useCallback(
        (fieldOnChange: (v: unknown) => void) => (newValue: unknown) => {
            fieldOnChange(newValue);
            onUserInteraction();
        },
        [onUserInteraction],
    );
    /* c8 ignore stop */

    const selectCreatedResource = useCallback(
        (option: AttributeSelectOption) => {
            onUserInteraction();
            selectCreated(option);
        },
        [onUserInteraction, selectCreated],
    );

    if (!descriptor) return <></>;

    if (isDataAttributeModel(descriptor) || isCustomAttributeModel(descriptor)) {
        const shouldRenderSelect = descriptor.properties.list || descriptor.contentType === AttributeContentType.Resource;

        if (shouldRenderSelect) {
            const addNewContent = addNewAttributeValue?.content;
            return (
                <>
                    <AttributeFieldSelect
                        name={name}
                        descriptor={descriptor}
                        options={pickerOptions}
                        busy={busy}
                        deleteButton={deleteButton}
                        createNewAction={addNewAttributeValue ? { label: '+ Create new', onClick: handleAddNew } : undefined}
                        onSelectChangeMulti={handleSelectChangeMulti}
                        onSelectChangeSingle={handleSelectChangeSingle}
                    />
                    {isAddingNew &&
                        typeof addNewContent === 'function' &&
                        isDataAttributeModel(descriptor) &&
                        addNewContent(descriptor, selectCreatedResource, closeAddNew)}
                </>
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
                    onFileCleared={onFileCleared}
                />
            );
        }
        return <AttributeFieldInput name={name} descriptor={descriptor} busy={busy} deleteButton={deleteButton} />;
    }

    const rawContent = getAttributeContent(descriptor.contentType, descriptor.content);
    let content = '';
    if (typeof rawContent === 'string') {
        content = rawContent;
    } else if (rawContent != null) {
        content = JSON.stringify(rawContent);
    }

    return <AttributeInfo name={descriptor.name} label={descriptor.properties.label} content={content} />;
}
