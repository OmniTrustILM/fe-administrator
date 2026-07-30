import Select from 'components/Select';
import Label from 'components/Label';
import CryptographicKeyForm from 'components/_pages/cryptographic-keys/form';
import { selectors as keySelectors } from 'ducks/cryptographic-keys';
import { actions as cryptographyOperationActions } from 'ducks/cryptographic-operations';
import { useCallback, useEffect, useMemo } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { actions as userInterfaceActions, selectors as userInterfaceSelectors } from '../../../../ducks/user-interface';
import { KeyType } from '../../../../types/openapi';

type Props = {
    type: 'alt' | 'normal';
    name: string;
    tokenProfileField: string;
};

const RenderRequestKey = ({ type, name, tokenProfileField }: Props) => {
    const dispatch = useDispatch();
    const { control, watch, setValue } = useFormContext();
    const initiateFormCallback = useSelector(userInterfaceSelectors.selectInitiateFormCallback);
    const formCallbackValue = useSelector(userInterfaceSelectors.selectCallbackValue);
    const keys = useSelector(keySelectors.cryptographicKeyPairs);
    const altKeys = useSelector(keySelectors.altCryptographicKeyPairs);
    const isAltKey = type === 'alt';

    const selectedTokenProfileUuid: string | undefined = watch(tokenProfileField);

    const availableKeys = useMemo(
        () => (isAltKey ? altKeys : keys).filter((key) => key.tokenProfileUuid === selectedTokenProfileUuid),
        [altKeys, isAltKey, keys, selectedTokenProfileUuid],
    );

    const keyOptions = useMemo(
        () => [
            ...availableKeys.map((key) => ({
                label: key.name,
                value: key.uuid,
            })),
            {
                label: '+ Add new',
                value: '__add_new__',
                disabled: false,
            },
        ],
        [availableKeys],
    );

    const handleKeyChange = useCallback(
        (keyUuid: string | number | undefined) => {
            if (!keyUuid || typeof keyUuid !== 'string') return;
            const selectedKey = availableKeys.find((key) => key.uuid === keyUuid);
            if (!selectedKey) return;

            const privateKeyItem = selectedKey.items.find((item) => item.type === KeyType.Private);
            if (!privateKeyItem) return;

            if (!selectedKey.tokenProfileUuid || !selectedKey.tokenInstanceUuid) return;

            dispatch(cryptographyOperationActions.clearSignatureAttributeDescriptors(type));
            dispatch(
                cryptographyOperationActions.listSignatureAttributeDescriptors({
                    uuid: selectedKey.uuid,
                    tokenProfileUuid: selectedKey.tokenProfileUuid,
                    tokenInstanceUuid: selectedKey.tokenInstanceUuid,
                    keyItemUuid: privateKeyItem.uuid,
                    algorithm: privateKeyItem.keyAlgorithm,
                    store: type,
                }),
            );
        },
        [availableKeys, dispatch, type],
    );

    const handleAddNewKey = useCallback(() => {
        dispatch(
            userInterfaceActions.showGlobalModal({
                content: <CryptographicKeyForm usesGlobalModal />,
                isOpen: true,
                size: 'xl',
                title: 'Add New Key',
            }),
        );
    }, [dispatch]);

    useEffect(() => {
        if (!initiateFormCallback || !formCallbackValue) return;
        const newOption = keyOptions.find((option) => option.label === formCallbackValue);
        if (newOption) {
            setValue(name, newOption.value, { shouldDirty: true, shouldTouch: true });
            handleKeyChange(newOption.value);
            dispatch(userInterfaceActions.clearFormCallbackValue());
            dispatch(userInterfaceActions.setInitiateFormCallback(false));
        }
    }, [dispatch, formCallbackValue, handleKeyChange, initiateFormCallback, keyOptions, name, setValue]);

    if (!selectedTokenProfileUuid) {
        return null;
    }

    return (
        <Controller
            name={name}
            control={control}
            rules={{ required: true }}
            render={({ field: { value, onChange }, fieldState: { error } }) => {
                return (
                    <div>
                        <Label htmlFor={`${name}Select`} required>
                            {isAltKey ? 'Alternative Key' : 'Key'}
                        </Label>
                        <Select
                            id={name}
                            options={keyOptions}
                            value={value ?? ''}
                            onChange={(selected) => {
                                if (selected === '__add_new__') {
                                    handleAddNewKey();
                                    return;
                                }
                                onChange(selected);
                                handleKeyChange(selected as string);
                            }}
                            placeholder={isAltKey ? 'Select Alternative Key' : 'Select Key'}
                        />
                        {error && <div className="text-red-500 mt-1">{error.message ?? 'Key is required.'}</div>}
                    </div>
                );
            }}
        />
    );
};

export default RenderRequestKey;
