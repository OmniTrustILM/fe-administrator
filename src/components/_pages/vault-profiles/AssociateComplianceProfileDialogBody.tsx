import { useCallback, useEffect, useMemo } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';

import Button from 'components/Button';
import Container from 'components/Container';
import Label from 'components/Label';
import Select from 'components/Select';
import Spinner from 'components/Spinner';

import { actions, selectors } from 'ducks/compliance-profiles';

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
    availableComplianceProfileUuids?: string[];
    resource: Resource;
    visible: boolean;
    onClose: () => void;
}>;

export default function AssociateComplianceProfileDialogBody({
    resourceObject,
    availableComplianceProfileUuids,
    resource,
    visible,
    onClose,
}: Props) {
    const dispatch = useDispatch();

    const complianceProfiles = useSelector(selectors.complianceProfiles);
    const isFetchingComplianceProfiles = useSelector(selectors.isFetchingList);

    const isBusy = useMemo(() => isFetchingComplianceProfiles, [isFetchingComplianceProfiles]);

    useEffect(() => {
        if (!visible) return;
        dispatch(actions.getListComplianceProfiles());
    }, [dispatch, visible]);

    const optionsForComplianceProfiles = useMemo(
        () =>
            complianceProfiles
                .filter((profile) => !availableComplianceProfileUuids?.includes(profile.uuid))
                .map((profile) => ({
                    value: profile.uuid,
                    label: profile.name,
                })),
        [complianceProfiles, availableComplianceProfileUuids],
    );

    const methods = useForm({
        mode: 'onTouched',
        defaultValues: {
            complianceProfileUuid: undefined as string | undefined,
        },
    });

    const { control, handleSubmit, formState } = methods;

    const onSubmit = useCallback(
        (values: { complianceProfileUuid: string | undefined }) => {
            if (!resourceObject || !values.complianceProfileUuid) return;

            dispatch(
                actions.associateComplianceProfile({
                    uuid: values.complianceProfileUuid,
                    resource,
                    associationObjectUuid: resourceObject.uuid,
                    associationObjectName: resourceObject.name,
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
                        name="complianceProfileUuid"
                        control={control}
                        rules={buildValidationRules([validateRequired()])}
                        render={({ field, fieldState }) => {
                            const fieldError = getFieldErrorMessage(fieldState, 'Required Field');

                            return (
                                <div className="mb-4">
                                    <Label
                                        htmlFor="complianceProfile"
                                        className="block text-sm font-medium mb-2 text-gray-700 dark:text-white"
                                    >
                                        Select Compliance profile
                                    </Label>

                                    <Select
                                        id="associate-compliance-profile-select"
                                        options={optionsForComplianceProfiles}
                                        value={field.value || ''}
                                        onChange={(value) => field.onChange(value)}
                                        placeholder="Select Compliance profile to be associated"
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
