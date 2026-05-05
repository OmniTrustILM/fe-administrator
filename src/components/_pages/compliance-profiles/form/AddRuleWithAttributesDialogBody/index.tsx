import AttributeEditor from 'components/Attributes/AttributeEditor';

import { actions } from 'ducks/compliance-profiles';
import { useCallback, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';

import Button from 'components/Button';
import type { AttributeDescriptorModel } from 'types/attributes';

import { collectFormAttributes } from 'utils/attributes/attributes';
import TabLayout from '../../../../Layout/TabLayout';
import Container from 'components/Container';

type Props = Readonly<{
    complianceProfileUuid?: string;
    connectorUuid: string;
    connectorName: string;
    kind: string;
    ruleUuid: string;
    ruleName: string;
    ruleDescription: string;
    groupUuid: string;
    attributes: AttributeDescriptorModel[];

    onClose: () => void;
}>;

export default function AddRuleWithAttributesDialogBody({
    complianceProfileUuid,
    connectorUuid,
    connectorName,
    kind,
    ruleUuid,
    ruleName,
    ruleDescription,
    groupUuid,
    attributes,
    onClose,
}: Props) {
    const dispatch = useDispatch();
    const [groupAttributesCallbackAttributes, setGroupAttributesCallbackAttributes] = useState<AttributeDescriptorModel[]>([]);

    const methods = useForm({
        mode: 'onTouched',
        defaultValues: {},
    });

    const { handleSubmit, formState } = methods;

    const onSubmit = useCallback(
        (values: any) => {
            if (!complianceProfileUuid) return;
            if (!connectorUuid) return;

            const attribs =
                attributes && attributes.length > 0
                    ? collectFormAttributes('attributes', [...(attributes ?? []), ...groupAttributesCallbackAttributes], values) || []
                    : [];
            dispatch(
                actions.addRule({
                    uuid: complianceProfileUuid,
                    addRequest: {
                        connectorUuid: connectorUuid,
                        kind: kind,
                        ruleUuid: ruleUuid,
                        attributes: attribs,
                    },
                }),
            );

            onClose();
        },
        [dispatch, complianceProfileUuid, connectorUuid, kind, ruleUuid, attributes, onClose, groupAttributesCallbackAttributes],
    );

    if (!complianceProfileUuid) return null;

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)}>
                {!attributes || attributes.length === 0 ? null : (
                    <div className="mb-4">
                        <TabLayout
                            tabs={[
                                {
                                    title: 'Custom Attributes',
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
                        disabled={formState.isSubmitting || !formState.isValid}
                        onClick={handleSubmit(onSubmit)}
                    >
                        Add
                    </Button>

                    <Button type="button" color="secondary" disabled={formState.isSubmitting} onClick={onClose}>
                        Cancel
                    </Button>
                </Container>
            </form>
        </FormProvider>
    );
}
