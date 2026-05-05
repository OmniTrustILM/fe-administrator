import AttributeEditor from 'components/Attributes/AttributeEditor';
import Spinner from 'components/Spinner';

import { actions, selectors } from 'ducks/cryptographic-operations';
import { useCallback, useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import type { AttributeDescriptorModel, AttributeRequestModel } from 'types/attributes';
import Button from 'components/Button';
import type { KeyAlgorithm } from 'types/openapi';
import { collectFormAttributes } from 'utils/attributes/attributes';
import FileUpload from '../../../Input/FileUpload/FileUpload';
import TabLayout from '../../../Layout/TabLayout';
import Container from 'components/Container';
import Widget from 'components/Widget';

type Props = Readonly<{
    tokenUuid?: string;
    tokenProfileUuid?: string;
    keyUuid?: string;
    keyItemUuid?: string;
    algorithm?: KeyAlgorithm;
    visible: boolean;
    action: 'sign' | 'verify';
    onClose: () => void;
}>;

export default function SignVerifyData({ tokenUuid, tokenProfileUuid, keyUuid, keyItemUuid, algorithm, visible, action, onClose }: Props) {
    const dispatch = useDispatch();

    const isFetchingAttributes = useSelector(selectors.isFetchingSignatureAttributes);

    const attributes = useSelector(selectors.signatureAttributeDescriptors);

    const [groupAttributesCallbackAttributes, setGroupAttributesCallbackAttributes] = useState<AttributeDescriptorModel[]>([]);

    const [fileContent, setFileContent] = useState<string>('');
    const [signatureContent, setSignatureContent] = useState<string>('');

    useEffect(
        () => {
            if (!visible) return;
            if (!tokenUuid) return;
            if (!tokenProfileUuid) return;
            if (!keyUuid) return;
            if (!keyItemUuid) return;
            if (!algorithm) return;
            dispatch(
                actions.listSignatureAttributeDescriptors({
                    tokenInstanceUuid: tokenUuid,
                    tokenProfileUuid: tokenProfileUuid,
                    uuid: keyUuid,
                    keyItemUuid: keyItemUuid,
                    algorithm: algorithm,
                }),
            );
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [visible, tokenUuid, dispatch],
    );

    const methods = useForm({
        mode: 'onTouched',
        defaultValues: {},
    });

    const { handleSubmit, formState, watch } = methods;

    const onSubmit = useCallback(
        (values: any) => {
            if (!tokenUuid) return;

            const allValues = watch();
            const attribs: AttributeRequestModel[] =
                attributes && attributes.length > 0
                    ? collectFormAttributes('attributes', [...(attributes ?? []), ...groupAttributesCallbackAttributes], allValues) || []
                    : [];
            if (action === 'sign') {
                dispatch(
                    actions.signData({
                        tokenInstanceUuid: tokenUuid,
                        keyItemUuid: keyItemUuid || '',
                        uuid: keyUuid || '',
                        tokenProfileUuid: tokenProfileUuid || '',
                        request: {
                            signatureAttributes: attribs,
                            data: [{ data: fileContent }],
                        },
                    }),
                );
            } else {
                dispatch(
                    actions.verifyData({
                        tokenInstanceUuid: tokenUuid,
                        keyItemUuid: keyItemUuid || '',
                        uuid: keyUuid || '',
                        tokenProfileUuid: tokenProfileUuid || '',
                        request: {
                            signatureAttributes: attribs,
                            signatures: [{ data: signatureContent }],
                            data: [{ data: fileContent }],
                        },
                    }),
                );
            }

            onClose();
        },
        [
            dispatch,
            attributes,
            onClose,
            tokenUuid,
            groupAttributesCallbackAttributes,
            action,
            keyUuid,
            keyItemUuid,
            tokenProfileUuid,
            fileContent,
            signatureContent,
            watch,
        ],
    );

    if (!tokenUuid) return <></>;

    return (
        <>
            <FormProvider {...methods}>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <Widget title="Data" titleSize="large">
                        <FileUpload
                            id="data"
                            editable
                            fileType={'data'}
                            onFileContentLoaded={(fileContent) => setFileContent(fileContent)}
                        />
                    </Widget>

                    {action === 'verify' ? (
                        <Widget title="Signature" titleSize="large">
                            <FileUpload
                                editable
                                id="signature"
                                fileType={'signature'}
                                onFileContentLoaded={(fileContent) => setSignatureContent(fileContent)}
                            />
                        </Widget>
                    ) : null}

                    {attributes && attributes.length > 0 && (
                        <div>
                            <TabLayout
                                tabs={[
                                    {
                                        title: 'Connector Attributes',
                                        content: (
                                            <AttributeEditor
                                                id="attributes"
                                                attributeDescriptors={attributes}
                                                groupAttributesCallbackAttributes={groupAttributesCallbackAttributes}
                                                setGroupAttributesCallbackAttributes={setGroupAttributesCallbackAttributes}
                                            />
                                        ),
                                    },
                                ]}
                            />
                        </div>
                    )}

                    <Container className="flex-row justify-end modal-footer" gap={4}>
                        <Button
                            type="submit"
                            color="primary"
                            disabled={
                                (action === 'verify' ? !signatureContent : false) ||
                                !fileContent ||
                                formState.isSubmitting ||
                                !formState.isValid
                            }
                        >
                            {action === 'sign' ? 'Sign' : 'Verify'}
                        </Button>
                        <Button type="button" variant="outline" color="secondary" onClick={onClose}>
                            Cancel
                        </Button>
                    </Container>
                </form>
            </FormProvider>

            <Spinner active={isFetchingAttributes} />
        </>
    );
}
