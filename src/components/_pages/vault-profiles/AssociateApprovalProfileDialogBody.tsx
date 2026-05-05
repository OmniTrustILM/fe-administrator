import { useCallback, useEffect, useMemo } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';

import Button from 'components/Button';
import Container from 'components/Container';
import Label from 'components/Label';
import Select from 'components/Select';
import Spinner from 'components/Spinner';

import { actions as approvalProfileActions, selectors as approvalProfileSelectors } from 'ducks/approval-profiles';

import cn from 'classnames';

import type { Resource } from 'types/openapi';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';
import { validateRequired } from 'utils/validators';

interface ResourceObject {
    uuid: string;
    name: string;
}

type Props = Readonly<{
    resourceObject?: ResourceObject;
    availableApprovalProfileUuids?: string[];
    resource: Resource;
    visible: boolean;
    onClose: () => void;
}>;

export default function AssociateApprovalProfileDialogBody({
    resourceObject,
    availableApprovalProfileUuids,
    resource,
    visible,
    onClose,
}: Props) {
    const dispatch = useDispatch();

    const approvalProfiles = useSelector(approvalProfileSelectors.profileApprovalList);
    const isFetchingApprovalProfiles = useSelector(approvalProfileSelectors.isFetchingList);
    const isAssociatingApprovalProfile = useSelector(approvalProfileSelectors.isAssociatingApprovalProfile);

    const isBusy = useMemo(
        () => isFetchingApprovalProfiles || isAssociatingApprovalProfile,
        [isAssociatingApprovalProfile, isFetchingApprovalProfiles],
    );

    useEffect(() => {
        if (!visible) return;
        dispatch(approvalProfileActions.listApprovalProfiles());
    }, [dispatch, visible]);

    const optionsForApprovalProfiles = useMemo(
        () =>
            approvalProfiles
                .filter((profile) => !availableApprovalProfileUuids?.includes(profile.uuid))
                .map((profile) => ({
                    value: profile.uuid,
                    label: profile.name,
                })),
        [approvalProfiles, availableApprovalProfileUuids],
    );

    const methods = useForm({
        mode: 'onTouched',
        defaultValues: {
            approvalProfileUuid: undefined as string | undefined,
        },
    });

    const { control, handleSubmit, formState } = methods;

    const onSubmit = useCallback(
        (values: { approvalProfileUuid: string | undefined }) => {
            if (!resourceObject || !values.approvalProfileUuid) return;

            dispatch(
                approvalProfileActions.associateApprovalProfileToResource({
                    uuid: values.approvalProfileUuid,
                    resource,
                    associationObjectUuid: resourceObject.uuid,
                }),
            );

            onClose();
        },
        [dispatch, onClose, resourceObject, resource],
    );

    if (!resourceObject) return <></>;

    return (
        <>
            <FormProvider {...methods}>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <Controller
                        name="approvalProfileUuid"
                        control={control}
                        rules={buildValidationRules([validateRequired()])}
                        render={({ field, fieldState }) => {
                            const fieldError = getFieldErrorMessage(fieldState, 'Required Field');

                            return (
                                <div className="mb-4">
                                    <Label
                                        htmlFor="approvalProfile"
                                        className="block text-sm font-medium mb-2 text-gray-700 dark:text-white"
                                    >
                                        Select Approval profile
                                    </Label>

                                    <Select
                                        id="associate-approval-profile-select"
                                        options={optionsForApprovalProfiles}
                                        value={field.value || ''}
                                        onChange={(value) => field.onChange(value as string | undefined)}
                                        placeholder="Select Approval profile to be associated"
                                        className={cn({
                                            'border-red-500': !!fieldError,
                                        })}
                                    />

                                    {fieldError && <p className="mt-1 text-sm text-red-600">{fieldError}</p>}
                                </div>
                            );
                        }}
                    />

                    <Container className="flex-row justify-end modal-footer" gap={4}>
                        <Button type="button" variant="outline" color="secondary" disabled={formState.isSubmitting} onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" color="primary" disabled={formState.isSubmitting || !formState.isValid}>
                            Associate
                        </Button>
                    </Container>
                </form>
            </FormProvider>
            <Spinner active={isBusy} />
        </>
    );
}
