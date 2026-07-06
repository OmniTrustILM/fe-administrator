import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { useMemo, useState } from 'react';
import usersReducer, { actions as usersActions } from 'ducks/users';
import certificateGroupsReducer, { actions as certificateGroupsActions } from 'ducks/certificateGroups';
import type { UserResponseModel } from 'types/users';
import type { CertificateGroupResponseModel } from 'types/certificateGroups';
import CertificateAssociationsFormWidget from './CertificateAssociationsFormWidget';

type Option = { value: string; label: string };

type WrapperProps = {
    users?: Array<{ uuid: string; username: string; firstName?: string; lastName?: string }>;
    groups?: Array<{ uuid: string; name: string }>;
    initialUserOptions?: Option[];
    initialGroupOptions?: Option[];
    renderCustomAttributes?: React.ReactNode;
};

type FormData = {
    owner: string;
    groups: Option[];
};

export function createCertificateAssociationsStore({ users = [], groups = [] }: Pick<WrapperProps, 'users' | 'groups'> = {}) {
    const store = configureStore({
        reducer: {
            users: usersReducer,
            certificateGroups: certificateGroupsReducer,
        },
    });

    if (users.length > 0) {
        store.dispatch(usersActions.listSuccess({ users: users as UserResponseModel[] }));
    }
    if (groups.length > 0) {
        store.dispatch(certificateGroupsActions.listGroupsSuccess({ groups: groups as CertificateGroupResponseModel[] }));
    }

    return store;
}

export default function CertificateAssociationsFormWidgetTestWrapper({
    users = [],
    groups = [],
    initialUserOptions = [],
    initialGroupOptions = [],
    renderCustomAttributes = <div data-testid="custom-attributes-content">Custom attributes content</div>,
}: Readonly<WrapperProps>) {
    const store = useMemo(() => createCertificateAssociationsStore({ users, groups }), [users, groups]);
    const methods = useForm<FormData>({
        defaultValues: {
            owner: '',
            groups: [],
        },
    });

    const [userOptions, setUserOptions] = useState<Option[]>(initialUserOptions);
    const [groupOptions, setGroupOptions] = useState<Option[]>(initialGroupOptions);

    const owner = useWatch({ control: methods.control, name: 'owner' }) || '';
    const selectedGroups = useWatch({ control: methods.control, name: 'groups' }) || [];

    return (
        <Provider store={store}>
            <MemoryRouter>
                <FormProvider {...methods}>
                    <CertificateAssociationsFormWidget
                        renderCustomAttributes={renderCustomAttributes}
                        userOptions={userOptions}
                        groupOptions={groupOptions}
                        setUserOptions={setUserOptions}
                        setGroupOptions={setGroupOptions}
                    />
                    <div data-testid="owner-value">{String(owner)}</div>
                    <div data-testid="groups-value">{JSON.stringify(selectedGroups)}</div>
                </FormProvider>
            </MemoryRouter>
        </Provider>
    );
}
