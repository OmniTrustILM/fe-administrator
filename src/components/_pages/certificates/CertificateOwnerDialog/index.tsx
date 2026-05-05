import { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import { actions } from 'ducks/certificates';

import Select from 'components/Select';
import Button from 'components/Button';
import type { UserResponseModel } from 'types/users';
import Container from 'components/Container';

type Props = Readonly<{
    uuids: string[];
    users: UserResponseModel[];
    onCancel: () => void;
    onUpdate: () => void;
}>;

export default function CertificateOwnerDialog({ uuids, onCancel, onUpdate, users }: Props) {
    const dispatch = useDispatch();

    const [ownerUuid, setOwnerUuid] = useState<string>();
    const [userOptions, setUserOptions] = useState<{ label: string; value: string }[]>([]);

    useEffect(() => {
        setUserOptions(
            users.map((user) => ({
                value: user.uuid,
                label: `${user.firstName ? user.firstName + ' ' : ''}${user.lastName ? user.lastName + ' ' : ''}(${user.username})`,
            })),
        );
    }, [dispatch, users]);

    const updateOwner = useCallback(() => {
        if (!ownerUuid || !users) {
            return;
        }
        const user = users.find((u) => u.uuid === ownerUuid);
        if (!user) {
            return;
        }
        dispatch(actions.bulkUpdateOwner({ request: { certificateUuids: uuids, ownerUuid, filters: [] }, user }));
        onUpdate();
    }, [dispatch, onUpdate, ownerUuid, users, uuids]);

    const removeOwner = useCallback(() => {
        dispatch(actions.bulkDeleteOwner({ certificateUuids: uuids }));
        onUpdate();
    }, [dispatch, onUpdate, uuids]);

    return (
        <>
            <div className="mb-4">
                <Select
                    id="certificateOwner"
                    options={userOptions}
                    placeholder={`Select Owner`}
                    value={ownerUuid || ''}
                    onChange={(value) => setOwnerUuid(value as string)}
                    label="Owner"
                />
            </div>

            <Container className="flex-row justify-end modal-footer" gap={4}>
                <Button color="secondary" variant="outline" onClick={onCancel} className="mr-auto">
                    Cancel
                </Button>
                <Button color="danger" onClick={removeOwner}>
                    Remove
                </Button>

                <Button color="primary" onClick={updateOwner} disabled={!ownerUuid}>
                    Update
                </Button>
            </Container>
        </>
    );
}
