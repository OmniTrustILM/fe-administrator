import AttributeEditor from 'components/Attributes/AttributeEditor';
import Spinner from 'components/Spinner';

import { actions, selectors } from 'ducks/cryptographic-operations';
import { useCallback, useEffect, useState } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import Button from 'components/Button';
import type { AttributeDescriptorModel, AttributeRequestModel } from 'types/attributes';

import { collectFormAttributes } from 'utils/attributes/attributes';
import { getFieldErrorMessage } from 'utils/validators-helper';
import TabLayout from '../../../Layout/TabLayout';
import TextInput from 'components/TextInput';
import Container from 'components/Container';

type Props = Readonly<{
    tokenUuid?: string;
    visible: boolean;
    onClose: () => void;
}>;

export default function RandomDataGeneration({ tokenUuid, visible, onClose }: Props) {
    const dispatch = useDispatch();

    const isFetchingAttributes = useSelector(selectors.isFetchingRandomDataAttributes);

    const attributes = useSelector(selectors.randomDataAttributeDescriptors);

    const [groupAttributesCallbackAttributes, setGroupAttributesCallbackAttributes] = useState<AttributeDescriptorModel[]>([]);

    useEffect(() => {
        if (!visible) return;
        if (!tokenUuid) return;
        dispatch(actions.listRandomAttributeDescriptors({ tokenInstanceUuid: tokenUuid }));
    }, [visible, tokenUuid, dispatch]);

    const onSubmit = useCallback(
        (values: any) => {
            if (!tokenUuid) return;

            const attribs: AttributeRequestModel[] =
                attributes && attributes.length > 0
                    ? collectFormAttributes('attributes', [...(attributes ?? []), ...groupAttributesCallbackAttributes], values) || []
                    : [];
            dispatch(
                actions.generateRandomData({
                    tokenInstanceUuid: tokenUuid,
                    request: {
                        attributes: attribs,
                        length: values.length,
                    },
                }),
            );

            onClose();
        },
        [dispatch, attributes, onClose, tokenUuid, groupAttributesCallbackAttributes],
    );

    const methods = useForm({
        mode: 'onTouched',
        defaultValues: {
            length: '',
        },
    });

    const { control, handleSubmit, formState } = methods;
    const allFormValues = useWatch({ control });

    const handleFormSubmit = (values: any) => {
        onSubmit(allFormValues);
    };

    if (!tokenUuid) return <></>;

    return (
        <>
            <FormProvider {...methods}>
                <form onSubmit={handleSubmit(handleFormSubmit)}>
                    <Controller
                        name="length"
                        control={control}
                        render={({ field, fieldState }) => (
                            <TextInput
                                {...field}
                                id="length"
                                type="number"
                                label="Random Data Length (in bytes)"
                                placeholder="Random Data Length (in bytes)"
                                invalid={fieldState.error && fieldState.isTouched}
                                error={getFieldErrorMessage(fieldState)}
                            />
                        )}
                    />

                    {!attributes || attributes.length === 0 ? (
                        <></>
                    ) : (
                        <div className="mb-4">
                            <br />
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
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            color="primary"
                            disabled={formState.isSubmitting || !formState.isValid}
                            onClick={handleSubmit(handleFormSubmit)}
                        >
                            Generate
                        </Button>
                    </Container>
                </form>
            </FormProvider>

            <Spinner active={isFetchingAttributes} />
        </>
    );
}
