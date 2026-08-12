import Select from 'components/Select';
import Label from 'components/Label';
import { actions as keyActions } from 'ducks/cryptographic-keys';
import { selectors as tokenProfileSelectors } from 'ducks/token-profiles';
import { useCallback, useEffect, useMemo } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { actions as userInterfaceActions, selectors as userInterfaceSelectors } from '../../../../ducks/user-interface';
import TokenProfileForm from 'components/_pages/token-profiles/form';

type Props = {
    type: 'alt' | 'normal';
    name: string;
};

const RenderTokenProfile = ({ type, name }: Props) => {
    const dispatch = useDispatch();
    const { control, setValue } = useFormContext();
    const tokenProfiles = useSelector(tokenProfileSelectors.tokenProfiles);
    const initiateFormCallback = useSelector(userInterfaceSelectors.selectInitiateFormCallback);
    const formCallbackValue = useSelector(userInterfaceSelectors.selectCallbackValue);

    const tokenProfileOptions = useMemo(
        () => [
            ...tokenProfiles.map((tokenProfile) => ({
                label: tokenProfile.name,
                value: tokenProfile.uuid,
            })),
            {
                label: '+ Add new',
                value: '__add_new__',
                disabled: false,
            },
        ],
        [tokenProfiles],
    );

    const handleTokenProfileChange = useCallback(
        (tokenProfileUuid: string | number | undefined) => {
            if (!tokenProfileUuid || typeof tokenProfileUuid !== 'string') return;
            dispatch(keyActions.listCryptographicKeyPairs({ tokenProfileUuid, store: type }));
        },
        [dispatch, type],
    );

    const handleAddNew = useCallback(() => {
        dispatch(
            userInterfaceActions.showGlobalModal({
                content: <TokenProfileForm usesGlobalModal />,
                isOpen: true,
                size: 'xl',
                title: 'Add New Token Profile',
            }),
        );
    }, [dispatch]);

    useEffect(() => {
        if (!initiateFormCallback || !formCallbackValue) return;
        const newOption = tokenProfileOptions.find((option) => option.label === formCallbackValue);
        if (newOption) {
            setValue(name, newOption.value, { shouldDirty: true, shouldTouch: true });
            handleTokenProfileChange(newOption.value);
            dispatch(userInterfaceActions.clearFormCallbackValue());
            dispatch(userInterfaceActions.setInitiateFormCallback(false));
        }
    }, [dispatch, formCallbackValue, handleTokenProfileChange, initiateFormCallback, tokenProfileOptions, name, setValue]);

    return (
        <Controller
            control={control}
            name={name}
            rules={{ required: true }}
            render={({ field: { value, onChange }, fieldState: { error } }) => (
                <div>
                    <Label htmlFor={`${name}Select`} required>
                        {type === 'alt' ? 'Alternative Token Profile' : 'Token Profile'}
                    </Label>
                    <Select
                        id={name}
                        options={tokenProfileOptions}
                        value={value ?? ''}
                        onChange={(selected) => {
                            if (selected === '__add_new__') {
                                handleAddNew();
                                return;
                            }
                            handleTokenProfileChange(selected as string);
                            onChange(selected);
                        }}
                        placeholder={type === 'alt' ? 'Select Alternative Token Profile' : 'Select Token Profile'}
                    />
                    {error && <div className="text-danger mt-1">{error.message ?? 'Token profile is required.'}</div>}
                </div>
            )}
        />
    );
};

export default RenderTokenProfile;
