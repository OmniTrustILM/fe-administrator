import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { type FieldValues, FormProvider, useForm } from 'react-hook-form';
import AttributeEditor from 'components/Attributes/AttributeEditor';
import FileUpload from 'components/Input/FileUpload/FileUpload';
import Container from 'components/Container';
import Button from 'components/Button';
import ProgressButton from 'components/ProgressButton';
import RetryCallout from 'components/RetryCallout';
import { actions as alertActions } from 'ducks/alerts';
import { selectors as cbomSelectors } from 'ducks/cbom';
import { actions as customAttributesActions, selectors as customAttributesSelectors } from 'ducks/customAttributes';
import { transformAttributeRequestModelToDto } from 'ducks/transform/attributes';
import { type CbomUploadRequestDto, Resource } from 'types/openapi';
import { collectFormAttributes } from 'utils/attributes/attributes';
import { base64ToUtf8 } from 'utils/common-utils';

type Props = {
    onCancel: () => void;
    onUpload: (data: CbomUploadRequestDto) => void;
    okButtonTitle?: string;
};

const CUSTOM_ATTRIBUTES_ID = 'customCbom';

export default function CbomUploadDialog({ onCancel, onUpload, okButtonTitle = 'Upload' }: Readonly<Props>) {
    const dispatch = useDispatch();
    const [fileContent, setFileContent] = useState<string>('');

    const isUploading = useSelector(cbomSelectors.selectIsUploading);
    const customAttributeDescriptors = useSelector(customAttributesSelectors.resourceCustomAttributes);
    const isListingCustomAttributes = useSelector(customAttributesSelectors.isFetchingResourceCustomAttributes);
    const customAttributesError = useSelector(customAttributesSelectors.resourceCustomAttributesError);
    const methods = useForm<FieldValues>({
        mode: 'onTouched',
        defaultValues: {},
    });
    const { handleSubmit, formState, getValues } = methods;

    const listCustomAttributes = useCallback(
        () => dispatch(customAttributesActions.listResourceCustomAttributes(Resource.Cboms)),
        [dispatch],
    );

    useEffect(() => {
        listCustomAttributes();
    }, [listCustomAttributes]);

    const validateCbomContent = useCallback(
        (parsedContent: unknown): parsedContent is Record<string, unknown> => {
            if (!parsedContent || typeof parsedContent !== 'object') {
                dispatch(alertActions.error('Invalid CBOM content'));
                return false;
            }

            const record = parsedContent as Record<string, unknown>;

            if (
                'metadata' in record &&
                (record.metadata === null || typeof record.metadata !== 'object' || Array.isArray(record.metadata))
            ) {
                dispatch(alertActions.error('Failed to upload CBOM: metadata must be an object when provided'));
                return false;
            }

            return true;
        },
        [dispatch],
    );

    const onFileContentLoaded = useCallback((base64Content: string) => setFileContent(base64ToUtf8(base64Content)), []);

    const upload = useCallback(
        (content: Record<string, unknown>) =>
            onUpload({
                content,
                customAttributes: collectFormAttributes(CUSTOM_ATTRIBUTES_ID, customAttributeDescriptors, getValues()).map(
                    transformAttributeRequestModelToDto,
                ),
            }),
        [onUpload, customAttributeDescriptors, getValues],
    );

    const onSubmit = useCallback(async () => {
        if (!fileContent) return;
        let parsed: unknown;
        try {
            parsed = JSON.parse(fileContent);
            if (!validateCbomContent(parsed)) return;
        } catch {
            // try YAML
            try {
                const yaml = await import('js-yaml');
                try {
                    parsed = yaml.load(fileContent);
                    if (!validateCbomContent(parsed)) return;
                    upload(parsed);
                } catch {
                    dispatch(alertActions.error('Failed to parse CBOM file (not valid JSON or YAML)'));
                }
            } catch {
                dispatch(alertActions.error('Failed to parse CBOM file (not valid JSON)'));
            }
            return;
        }

        upload(parsed);
    }, [fileContent, upload, dispatch, validateCbomContent]);

    // A failed listing leaves required custom attributes unasked, so the upload waits for it.
    const customAttributesReady = !isListingCustomAttributes && !customAttributesError;

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="space-y-4">
                    <FileUpload
                        id="cbom-upload"
                        fileType="CBOM"
                        editable
                        showFileInfo={false}
                        onFileContentLoaded={onFileContentLoaded}
                        contentPlaceholderText="Drag & drop CBOM file here or click to browse (JSON / YAML)"
                        dropZoneHintText="Upload a Cryptographic Bill of Materials generated by CBOM-Lens or other compatible tools."
                    />

                    {(customAttributesError || (!isListingCustomAttributes && customAttributeDescriptors.length > 0)) && (
                        <section aria-labelledby="cbomUploadCustomAttributes" className="space-y-3">
                            <h4
                                id="cbomUploadCustomAttributes"
                                className="text-xs font-semibold uppercase tracking-wide text-content-muted"
                            >
                                Custom attributes
                            </h4>
                            {customAttributesError ? (
                                <RetryCallout message={customAttributesError} onRetry={listCustomAttributes} />
                            ) : (
                                <AttributeEditor id={CUSTOM_ATTRIBUTES_ID} attributeDescriptors={customAttributeDescriptors} />
                            )}
                        </section>
                    )}

                    <Container className="flex-row justify-end modal-footer" gap={4}>
                        <Button variant="outline" onClick={onCancel} disabled={formState.isSubmitting || isUploading} type="button">
                            Cancel
                        </Button>
                        <ProgressButton
                            title={okButtonTitle}
                            inProgressTitle={okButtonTitle}
                            inProgress={formState.isSubmitting || isUploading}
                            disabled={!fileContent || !customAttributesReady}
                        />
                    </Container>
                </div>
            </form>
        </FormProvider>
    );
}
