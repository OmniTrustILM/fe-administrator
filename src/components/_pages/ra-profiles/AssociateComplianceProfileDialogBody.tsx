import { useCallback, useEffect, useMemo } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import Select from 'components/Select';
import Button from 'components/Button';

import { buildValidationRules } from 'utils/validators-helper';
import { validateRequired } from 'utils/validators';
import cn from 'classnames';

import Spinner from 'components/Spinner';
import Label from 'components/Label';

import { actions, selectors } from 'ducks/compliance-profiles';
import type { RaProfileResponseModel } from 'types/ra-profiles';
import { Resource } from 'types/openapi';
import Container from 'components/Container';

type Props = Readonly<{
    raProfile?: RaProfileResponseModel;
    availableComplianceProfileUuids?: string[];
    visible: boolean;
    onClose: () => void;
}>;

export default function AssociateComplianceProfileDialogBody({ raProfile, availableComplianceProfileUuids, visible, onClose }: Props) {
    const dispatch = useDispatch();

    const complianceProfiles = useSelector(selectors.complianceProfiles);

    const isFetchingComplianceProfiles = useSelector(selectors.isFetchingList);

    const isBusy = useMemo(() => isFetchingComplianceProfiles, [isFetchingComplianceProfiles]);

    useEffect(
        () => {
            if (!visible) return;
            dispatch(actions.getListComplianceProfiles());
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [visible],
    );

    const optionsForComplianceProfiles = useMemo(
        () =>
            complianceProfiles
                .filter((e) => !availableComplianceProfileUuids?.includes(e.uuid))
                .map((raProfile) => ({
                    value: raProfile.uuid,
                    label: raProfile.name,
                })),
        [complianceProfiles, availableComplianceProfileUuids],
    );

    const methods = useForm({
        mode: 'onTouched',
        defaultValues: {
            complianceProfiles: undefined as string | undefined,
        },
    });

    const { control, handleSubmit, formState } = methods;

    const onSubmit = useCallback(
        (values: { complianceProfiles: string | undefined }) => {
            if (!raProfile || !values.complianceProfiles) return;

            dispatch(
                actions.associateComplianceProfile({
                    uuid: values.complianceProfiles,
                    resource: Resource.RaProfiles,
                    associationObjectUuid: raProfile.uuid,
                    associationObjectName: raProfile.name,
                }),
            );

            onClose();
        },
        [dispatch, onClose, raProfile],
    );

    if (!raProfile) return <></>;

    return (
        <>
            <FormProvider {...methods}>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <Controller
                        name="complianceProfiles"
                        control={control}
                        rules={buildValidationRules([validateRequired()])}
                        render={({ field, fieldState }) => (
                            <div className="mb-4">
                                <Label htmlFor="complianceProfile" className="block text-sm font-medium mb-2 text-gray-700 dark:text-white">
                                    Select Compliance profile
                                </Label>

                                <Select
                                    id="associate-compliance-profile-select"
                                    options={optionsForComplianceProfiles}
                                    value={field.value ?? null}
                                    onChange={(value) => field.onChange(value)}
                                    placeholder="Select Compliance profile to be associated"
                                    className={cn({
                                        'border-red-500': fieldState.error && fieldState.isTouched,
                                    })}
                                />

                                {fieldState.error && fieldState.isTouched && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {typeof fieldState.error === 'string'
                                            ? fieldState.error
                                            : fieldState.error?.message || 'Required Field'}
                                    </p>
                                )}
                            </div>
                        )}
                    />

                    <Container className="flex-row justify-end modal-footer" gap={4}>
                        <Button type="button" variant="outline" color="secondary" disabled={formState.isSubmitting} onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            color="primary"
                            disabled={formState.isSubmitting || !formState.isValid}
                            onClick={handleSubmit(onSubmit)}
                        >
                            Associate
                        </Button>
                    </Container>
                </form>
            </FormProvider>

            <Spinner active={isBusy} />
        </>
    );
}
