import { Controller, useFormContext } from 'react-hook-form';
import Select from 'components/Select';
import Widget from 'components/Widget';
import { actions as groupsActions, selectors as groupsSelectors } from 'ducks/certificateGroups';
import { actions as userAction, selectors as userSelectors } from 'ducks/users';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { buildUserOption } from 'utils/widget';

type Props = Readonly<{
    userOptions: { value: string; label: string }[];
    groupOptions: { value: string; label: string }[];
    setUserOptions: (options: { value: string; label: string }[]) => void;
    setGroupOptions: (options: { value: string; label: string }[]) => void;
    renderCustomAttributes: React.ReactNode;
}>;

export default function CertificateAssociationsFormWidget({
    renderCustomAttributes,
    userOptions,
    groupOptions,
    setUserOptions,
    setGroupOptions,
}: Props) {
    const dispatch = useDispatch();
    const users = useSelector(userSelectors.users);
    const groups = useSelector(groupsSelectors.certificateGroups);

    useEffect(() => {
        dispatch(userAction.list());
    }, [dispatch]);

    useEffect(() => {
        if (users.length > 0) {
            setUserOptions(users.map((user) => buildUserOption(user)));
        }
    }, [setUserOptions, users]);

    useEffect(() => {
        dispatch(groupsActions.listGroups());
    }, [dispatch]);

    useEffect(() => {
        if (groups.length > 0) {
            setGroupOptions(
                groups.map((group) => ({
                    value: group.uuid,
                    label: group.name,
                })),
            );
        }
    }, [groups, setGroupOptions]);

    const { control } = useFormContext();

    return (
        <Widget title="Default Certificate associations">
            <div className="space-y-4">
                <Controller
                    name="owner"
                    control={control}
                    render={({ field }) => (
                        <Select
                            id="owner"
                            label="Owner"
                            value={field.value || ''}
                            onChange={(value) => {
                                field.onChange(value);
                            }}
                            options={userOptions}
                            placeholder="Select Owner"
                            isClearable
                            placement="bottom"
                        />
                    )}
                />
                <Controller
                    name="groups"
                    control={control}
                    render={({ field }) => (
                        <Select
                            id="groups"
                            label="Groups"
                            isMulti
                            value={field.value || []}
                            onChange={(value) => {
                                field.onChange(value);
                            }}
                            options={groupOptions}
                            placeholder="Select Groups"
                            isClearable
                            placement="bottom"
                        />
                    )}
                />

                <Widget noBorder title="Certificate Custom Attributes">
                    {renderCustomAttributes}
                </Widget>
            </div>
        </Widget>
    );
}
