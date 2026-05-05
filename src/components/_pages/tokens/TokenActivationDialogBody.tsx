import AttributeEditor from 'components/Attributes/AttributeEditor';
import Spinner from 'components/Spinner';

import { actions, selectors } from 'ducks/tokens';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import Button from 'components/Button';
import type { AttributeDescriptorModel, AttributeRequestModel } from 'types/attributes';

import { collectFormAttributes } from 'utils/attributes/attributes';
import TabLayout from '../../Layout/TabLayout';
import Container from 'components/Container';

type Props = Readonly<{
    tokenUuid?: string;
    visible: boolean;
    onClose: () => void;
}>;

export default function TokenActivationDialogBody({ tokenUuid, visible, onClose }: Props) {
    const dispatch = useDispatch();

    const activationAttributes = useSelector(selectors.activationAttributes);

    const [activationGroupAttributesCallbackAttributes, setActivationGroupAttributesCallbackAttributes] = useState<
        AttributeDescriptorModel[]
    >([]);

    const isFetchingTokens = useSelector(selectors.isFetchingList);
    const isFetchingActivationAttributes = useSelector(selectors.isFetchingActivationAttributeDescriptors);

    const isBusy = useMemo(() => isFetchingTokens || isFetchingActivationAttributes, [isFetchingTokens, isFetchingActivationAttributes]);

    useEffect(
        () => {
            if (!visible) return;
            if (!tokenUuid) return;
            dispatch(actions.listActivationAttributeDescriptors({ uuid: tokenUuid || '' }));
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [visible],
    );

    const onActivateSubmit = useCallback(
        (values: any) => {
            if (!tokenUuid) return;

            const activationAttribs: AttributeRequestModel[] =
                activationAttributes && activationAttributes.length > 0
                    ? collectFormAttributes(
                          'activationAttributes',
                          [...(activationAttributes ?? []), ...activationGroupAttributesCallbackAttributes],
                          values,
                      ) || []
                    : [];
            dispatch(
                actions.activateToken({
                    uuid: tokenUuid,
                    request: activationAttribs,
                }),
            );

            onClose();
        },
        [dispatch, activationAttributes, onClose, tokenUuid, activationGroupAttributesCallbackAttributes],
    );

    const methods = useForm({
        mode: 'onTouched',
        defaultValues: {},
    });

    const { handleSubmit, formState, watch } = methods;

    const onSubmit = (values: any) => {
        const allValues = watch();
        onActivateSubmit(allValues);
    };

    if (!tokenUuid) return <></>;

    return (
        <>
            <FormProvider {...methods}>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <br />
                    <TabLayout
                        tabs={[
                            {
                                title: 'Issue attributes',
                                content:
                                    !activationAttributes || activationAttributes.length === 0 ? (
                                        <></>
                                    ) : (
                                        <AttributeEditor
                                            id="activationAttributes"
                                            attributeDescriptors={activationAttributes}
                                            groupAttributesCallbackAttributes={activationGroupAttributesCallbackAttributes}
                                            setGroupAttributesCallbackAttributes={setActivationGroupAttributesCallbackAttributes}
                                        />
                                    ),
                            },
                        ]}
                    />

                    <Container className="flex-row justify-end modal-footer" gap={4}>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            color="primary"
                            disabled={formState.isSubmitting || !formState.isValid}
                            onClick={handleSubmit(onSubmit)}
                        >
                            Activate
                        </Button>
                    </Container>
                </form>
            </FormProvider>

            <Spinner active={isBusy} />
        </>
    );
}
