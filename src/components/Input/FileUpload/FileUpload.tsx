import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import TextInput from 'components/TextInput';
import TextArea from 'components/TextArea';
import Button from 'components/Button';

type Props = {
    onFileContentLoaded: (fileContent: string) => void;
    /**
     * Called as the content starts to change: on each edit of the content area, and as a chosen file starts to be read.
     * If that read fails, the content still shown is reported again through `onFileContentLoaded`.
     */
    onContentChange?: () => void;
    id?: string;
    contentTestId?: string;
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
    contentTestId,
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
    // The current content as it is reported, base64-encoded: the chosen file's, or the text typed or pasted in.
    const reportedContentRef = useRef('');
    const [fileName, setFileName] = useState('');
    const [contentType, setContentType] = useState('');
    const [readError, setReadError] = useState<string>();
    const fileInputRef = useRef<HTMLInputElement>(null);
    // The reader of the latest file choice. A result from any earlier reader, or one after unmount, is ignored.
    const readerRef = useRef<FileReader>(undefined);

    useEffect(
        () => () => {
            readerRef.current = undefined;
        },
        [],
    );

    const onFileLoaded = useCallback(
        (data: ProgressEvent<FileReader>, fileName: string) => {
            const fileInfo = data.target!.result as string;
            const contentType = fileInfo.split(',')[0].split(':')[1].split(';')[0];
            const fileContent = fileInfo.split(',')[1];

            reportedContentRef.current = fileContent;
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
            readerRef.current = reader;
            setReadError(undefined);
            onContentChange?.();
            reader.onload = (data) => {
                if (readerRef.current === reader) onFileLoaded(data, file.name);
            };
            reader.onerror = () => {
                if (readerRef.current !== reader) return;
                setReadError(`The file ${file.name} could not be read.`);
                // A failed read changes nothing, so the content still shown is reported again to a caller that dropped it.
                if (reportedContentRef.current) onFileContentLoaded(reportedContentRef.current);
            };
            reader.readAsDataURL(file);
        },
        [onContentChange, onFileContentLoaded, onFileLoaded],
    );

    const onFileChanged = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            // Choosing the file the input still holds fires no change, so the input is emptied once its file is taken.
            e.target.value = '';
            if (file) createReader(file);
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
            // Text typed in replaces the file: a read still running for it is ignored, and a failed read's error is cleared.
            readerRef.current = undefined;
            setReadError(undefined);
            reportedContentRef.current = fileContentLatest ? btoa(fileContentLatest) : '';
            setFileContent(fileContentLatest);
            onContentChange?.();
            if (fileContentLatest) {
                onFileContentLoaded(reportedContentRef.current);
            }
        },
        [onContentChange, onFileContentLoaded],
    );

    const onFileInputTextBlurred = useCallback(() => {
        if (!reportedContentRef.current) return;
        onFileContentLoaded(reportedContentRef.current);
    }, [onFileContentLoaded]);

    const resolvedContentPlaceholderText =
        contentPlaceholderText || `Select or drag & drop ${fileType} file or paste file content in the text area.`;
    const resolvedDropZoneHintText =
        dropZoneHintText || `Select or drag & drop ${fileType} file to drop zone or paste file content in the text area.`;

    return (
        <section aria-label="File upload area" onDrop={onFileDrop} onDragOver={onFileDragOver}>
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
                        dataTestId={contentTestId}
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
                        className={editable ? '' : 'bg-surface-sunken'}
                    />
                </div>
            )}

            <div className="text-sm text-content-subtle mt-4 mb-2">{resolvedDropZoneHintText}</div>
            <div>
                <Button variant="transparent" color="secondary" onClick={() => fileInputRef.current?.click()}>
                    Select file...
                </Button>
                <input
                    ref={fileInputRef}
                    id={`${id}__fileUpload__file`}
                    type="file"
                    className="hidden"
                    aria-label="Select file"
                    onChange={onFileChanged}
                />
            </div>
            {readError && (
                <p role="alert" className="mt-2 text-sm text-danger">
                    {readError}
                </p>
            )}
        </section>
    );
}
