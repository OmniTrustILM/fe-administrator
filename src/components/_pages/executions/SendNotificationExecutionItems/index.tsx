import Widget from 'components/Widget';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Select from 'components/Select';
import { Fragment } from 'react/jsx-runtime';
import Button from 'components/Button';
import Label from 'components/Label';
import Badge from 'components/Badge';
import { selectors as notificationProfileSelectors, actions as notificationProfileActions } from 'ducks/notification-profiles';
import Container from 'components/Container';

interface SelectChangeValue {
    value: string;
    label: string;
}

type Props = Readonly<{
    mode: 'form' | 'detail';
    isUpdating?: boolean;
    notificationProfileItems?: SelectChangeValue[];
    onNotificationProfileItemsChange: (items: SelectChangeValue[]) => void;
}>;

export function SendNotificationExecutionItems({ mode, isUpdating, notificationProfileItems, onNotificationProfileItemsChange }: Props) {
    const dispatch = useDispatch();

    const notificationProfiles = useSelector(notificationProfileSelectors.notificationProfiles);
    const isFetchingList = useSelector(notificationProfileSelectors.isFetchingList);

    const [selectedProfile, setSelectedProfile] = useState<SelectChangeValue | null>(null);
    const [selectedProfiles, setSelectedProfiles] = useState<SelectChangeValue[]>(notificationProfileItems ?? []);

    useEffect(() => {
        dispatch(notificationProfileActions.listNotificationProfiles({ itemsPerPage: 100 }));
    }, [dispatch]);

    const onAddProfileClick = useCallback(() => {
        if (!selectedProfile) return;
        setSelectedProfiles((state) => [...state, selectedProfile]);
        setSelectedProfile(null);
        onNotificationProfileItemsChange([...(notificationProfileItems ?? []), selectedProfile]);
    }, [selectedProfile, notificationProfileItems, onNotificationProfileItemsChange]);

    const onRemoveProfileClick = useCallback(
        (uuid: string) => {
            setSelectedProfiles((state) => state.filter((el) => el.value !== uuid));
            onNotificationProfileItemsChange(notificationProfileItems?.filter((el) => el.value !== uuid) ?? []);
        },
        [notificationProfileItems, onNotificationProfileItemsChange],
    );

    const profileSelectOptions = useMemo(
        () =>
            notificationProfiles
                .map((profile) => ({
                    label: profile.name,
                    value: profile.uuid,
                }))
                .filter((el) => !selectedProfiles.map(({ value }) => value).includes(el.value)),
        [notificationProfiles, selectedProfiles],
    );

    const getBadgeContent = useCallback(
        (itemNumber: number, label: string, value: string, disableBadgeRemove: boolean) => {
            if (isFetchingList) return <></>;

            return (
                <Fragment key={itemNumber}>
                    <span>Send notifications to:&nbsp;</span>
                    <b>{label}&nbsp;</b>
                    {!disableBadgeRemove && <button onClick={() => onRemoveProfileClick(value)}>&times;</button>}
                </Fragment>
            );
        },
        [isFetchingList, onRemoveProfileClick],
    );

    return (
        <Widget title="Execution Items" busy={isFetchingList || isUpdating} titleSize="large">
            <div>
                <Label htmlFor="fieldSelectInput">Notification Profile</Label>
                <Container gap={2} className="flex-row">
                    <div className="grow">
                        <Select
                            id="field"
                            placeholder="Select Notification Profile"
                            options={profileSelectOptions}
                            onChange={(value) => {
                                setSelectedProfile(
                                    value
                                        ? {
                                              value: value as string,
                                              label: profileSelectOptions.find((opt) => opt.value === value)?.label || '',
                                          }
                                        : null,
                                );
                            }}
                            value={selectedProfile?.value || ''}
                        />
                    </div>

                    <Button color="primary" disabled={isFetchingList || !selectedProfile} onClick={onAddProfileClick}>
                        Add
                    </Button>
                </Container>
            </div>

            {selectedProfiles.length > 0 && (
                <div className="flex gap-2 flex-wrap pt-2">
                    {selectedProfiles.map((profile, i) => (
                        <Badge key={profile.value + i}>
                            {getBadgeContent(i, profile.label, profile.value, selectedProfiles.length <= 1 && mode === 'detail')}
                        </Badge>
                    ))}
                </div>
            )}
        </Widget>
    );
}
