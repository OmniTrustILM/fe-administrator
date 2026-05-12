import type React from 'react';
import { useCallback, useRef, useState } from 'react';

import Label from 'components/Label';
import TextInput from 'components/TextInput';
import TextArea from 'components/TextArea';
import Button from 'components/Button';

type Props = {
    onFileContentLoaded: (fileContent: string) => void;
    onContentChange?: () => void;
    id?: string;
    fileType?: string;
    showContent?: boolean;
    showFileInfo?: boolean;
    editable?: boolean;
    required?: boolean;
    error?: string;
    contentPlaceholderText?: string;
    dropZoneHintText?: string;
};

export default function FileUpload({
    id = '',
    fileType = '',
    editable,
    onFileContentLoaded,
    onContentChange,
    showContent = true,
    showFileInfo = true,
    required,
    error,
    contentPlaceholderText,
    dropZoneHintText,
}: Readonly<Props>) {
    const [fileContent, setFileContent] = useState('');
    const fileContentRef = useRef('');
    const [fileName, setFileName] = useState('');
    const [contentType, setContentType] = useState('');

    const onFileLoaded = useCallback(
        (data: ProgressEvent<FileReader>, fileName: string) => {
            const fileInfo = data.target!.result as string;
            const contentType = fileInfo.split(',')[0].split(':')[1].split(';')[0];
            const fileContent = fileInfo.split(',')[1];

            setFileContent(fileContent);
            setFileName(fileName);
            setContentType(contentType);
            onFileContentLoaded(fileContent);
        },
        [onFileContentLoaded],
    );

    const createReader = useCallback(
        (file: File) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (data) => onFileLoaded(data, file.name);
        },
        [onFileLoaded],
    );

    const onFileChanged = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            if (!e.target.files || e.target.files.length === 0) {
                return;
            }

            createReader(e.target.files[0]);
        },
        [createReader],
    );

    const onFileDrop = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            if (!e.dataTransfer?.files?.length) {
                return;
            }

            createReader(e.dataTransfer.files[0]);
        },
        [createReader],
    );

    const onFileDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => e.preventDefault(), []);

    const onFileInputTextChanged = useCallback(
        (fileContentLatest: string) => {
            fileContentRef.current = fileContentLatest;
            setFileContent(fileContentLatest);
            onContentChange?.();
            if (fileContentLatest) {
                onFileContentLoaded(btoa(fileContentLatest));
            }
        },
        [onContentChange, onFileContentLoaded],
    );

    const onFileInputTextBlurred = useCallback(() => {
        if (!fileContentRef.current) return;
        onFileContentLoaded(btoa(fileContentRef.current));
    }, [onFileContentLoaded]);

    const resolvedContentPlaceholderText =
        contentPlaceholderText || `Select or drag & drop ${fileType} file or paste file content in the text area.`;
    const resolvedDropZoneHintText =
        dropZoneHintText || `Select or drag & drop ${fileType} file to drop zone or paste file content in the text area.`;

    return (
        <div role="region" aria-label="File upload area" onDrop={onFileDrop} onDragOver={onFileDragOver}>
            {showFileInfo && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <TextInput
                            id={`${id}__fileUpload__fileName`}
                            type="text"
                            placeholder="File not selected"
                            disabled
                            value={fileName}
                            onChange={() => {}}
                            label="File name"
                        />
                    </div>

                    <div>
                        <TextInput
                            id={`${id}__fileUpload__contentType`}
                            type="text"
                            placeholder="File not selected"
                            disabled
                            value={contentType}
                            onChange={() => {}}
                            label="Content type"
                        />
                    </div>
                </div>
            )}

            {showContent && (
                <div className="mb-4">
                    <TextArea
                        id={`${id}__fileUpload__fileContent`}
                        label="File content"
                        rows={3}
                        placeholder={resolvedContentPlaceholderText}
                        disabled={!editable}
                        required={required}
                        invalid={!!error}
                        error={error}
                        value={fileContent}
                        onChange={onFileInputTextChanged}
                        onBlur={onFileInputTextBlurred}
                        className={editable ? '' : 'bg-gray-50 dark:bg-neutral-800'}
                    />
                </div>
            )}

            <div className="text-sm text-gray-500 mt-4 dark:text-neutral-400 mb-2">{resolvedDropZoneHintText}</div>
            <div>
                <Label htmlFor={`${id}__fileUpload__file`} className="cursor-pointer">
                    <Button variant="transparent" color="secondary" onClick={() => {}} className="pointer-events-none">
                        Select file...
                    </Button>
                </Label>
                <input id={`${id}__fileUpload__file`} type="file" className="hidden" onChange={onFileChanged} />
            </div>
        </div>
    );
}
