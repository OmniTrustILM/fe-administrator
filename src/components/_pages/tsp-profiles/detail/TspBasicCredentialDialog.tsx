import { useCallback, useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';

import Button from 'components/Button';
import Container from 'components/Container';
import ProgressButton from 'components/ProgressButton';
import Select from 'components/Select';
import TextInput from 'components/TextInput';

import { actions as basicCredentialActions, selectors as basicCredentialSelectors } from 'ducks/tsp-profile-basic-credentials';
import { actions as userActions, selectors as userSelectors } from 'ducks/users';

import type { TspBasicCredentialDto, TspBasicCredentialRequestDto } from 'types/openapi';
import { validateRequired } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';
import { buildUserOption } from 'utils/widget';

interface FormValues {
    username: string;
    password: string;
    mappedUser: string;
}

type Props = {
    tspProfileUuid: string;
    credential?: TspBasicCredentialDto;
    onClose: () => void;
};

export default function TspBasicCredentialDialog({ tspProfileUuid, credential, onClose }: Readonly<Props>) {
    const dispatch = useDispatch();
    const editMode = !!credential;

    const users = useSelector(userSelectors.users);
    const isCreating = useSelector(basicCredentialSelectors.isCreating);
    const isUpdating = useSelector(basicCredentialSelectors.isUpdating);
    const saveSucceeded = useSelector(basicCredentialSelectors.saveSucceeded);
    const saveErrorMessage = useSelector(basicCredentialSelectors.saveErrorMessage);

    useEffect(() => {
        dispatch(userActions.list());
    }, [dispatch]);

    useEffect(() => {
        if (saveSucceeded) {
            dispatch(basicCredentialActions.clearSaveStatus());
            onClose();
        }
    }, [saveSucceeded, dispatch, onClose]);

    // Drop a stale validation error when the dialog is cancelled mid-edit.
    useEffect(() => {
        return () => {
            dispatch(basicCredentialActions.clearSaveStatus());
        };
    }, [dispatch]);

    // System users (e.g. superadmin, acme/scep/cmp protocol users) cannot back a Basic credential.
    const userOptions = useMemo(() => users.filter((user) => !user.systemUser).map((user) => buildUserOption(user)), [users]);

    const {
        handleSubmit,
        control,
        formState: { isSubmitting, isValid, isDirty },
    } = useForm<FormValues>({
        defaultValues: {
            username: credential?.username ?? '',
            password: '',
            mappedUser: credential?.mappedUser.uuid ?? '',
        },
        mode: 'onChange',
    });

    const onSubmit = useCallback(
        (values: FormValues) => {
            const request: TspBasicCredentialRequestDto = {
                username: values.username,
                password: values.password || undefined,
                mappedUserUuid: values.mappedUser,
            };

            if (editMode && credential) {
                dispatch(basicCredentialActions.updateBasicCredential({ tspProfileUuid, uuid: credential.uuid, request }));
            } else {
                dispatch(basicCredentialActions.createBasicCredential({ tspProfileUuid, request }));
            }
        },
        [dispatch, editMode, credential, tspProfileUuid],
    );

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
                <Controller
                    name="username"
                    control={control}
                    rules={buildValidationRules([validateRequired()])}
                    render={({ field, fieldState }) => (
                        <TextInput
                            {...field}
                            id="username"
                            type="text"
                            label="Username"
                            required
                            invalid={fieldState.error && fieldState.isTouched}
                            error={getFieldErrorMessage(fieldState)}
                        />
                    )}
                />

                <Controller
                    name="password"
                    control={control}
                    rules={editMode ? undefined : buildValidationRules([validateRequired()])}
                    render={({ field, fieldState }) => (
                        <div>
                            <TextInput
                                {...field}
                                id="password"
                                type="password"
                                label="Password"
                                required={!editMode}
                                invalid={fieldState.error && fieldState.isTouched}
                                error={getFieldErrorMessage(fieldState)}
                            />
                            {editMode && <p className="mt-1 text-sm text-gray-500">Leave blank to keep the current password.</p>}
                        </div>
                    )}
                />

                <Controller
                    name="mappedUser"
                    control={control}
                    rules={buildValidationRules([validateRequired()])}
                    render={({ field, fieldState }) => (
                        <Select
                            id="mappedUserSelect"
                            label="Mapped User"
                            required
                            value={field.value || ''}
                            onChange={field.onChange}
                            options={userOptions}
                            placeholder="Select the user this credential authenticates as"
                            placement="bottom"
                            error={fieldState.error?.message}
                        />
                    )}
                />

                {saveErrorMessage.length > 0 && <p className="text-sm text-[var(--status-danger-color)]">{saveErrorMessage}</p>}

                <Container className="flex-row justify-end modal-footer" gap={4}>
                    <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <ProgressButton
                        title={editMode ? 'Update' : 'Create'}
                        inProgressTitle={editMode ? 'Updating...' : 'Creating...'}
                        inProgress={isSubmitting || isCreating || isUpdating}
                        disabled={!isDirty || isSubmitting || !isValid}
                        type="submit"
                    />
                </Container>
            </div>
        </form>
    );
}
