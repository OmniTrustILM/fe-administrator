import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { actions as groupsActions, selectors as groupsSelectors } from 'ducks/certificateGroups';
import { actions } from 'ducks/certificates';

import Select from 'components/Select';

import Spinner from 'components/Spinner';
import Button from 'components/Button';
import Container from 'components/Container';

type Props = {
    uuids: string[];
    onCancel: () => void;
    onUpdate: () => void;
};

interface SelectChangeValue {
    value: string;
    label: string;
}

export default function CertificateGroupDialog({ uuids, onCancel, onUpdate }: Readonly<Props>) {
    const dispatch = useDispatch();

    const groups = useSelector(groupsSelectors.certificateGroups);

    const isFetchingGroups = useSelector(groupsSelectors.isFetchingList);

    const [selectedGroups, setSelectedGroups] = useState<SelectChangeValue[]>();

    useEffect(() => {
        dispatch(groupsActions.listGroups());
    }, [dispatch]);

    const updateGroup = useCallback(() => {
        if (!selectedGroups?.length) return;
        dispatch(actions.bulkUpdateGroup({ certificateUuids: uuids, groupUuids: selectedGroups.map((group) => group.value), filters: [] }));
        onUpdate();
    }, [dispatch, onUpdate, selectedGroups, uuids]);

    const removeGroup = useCallback(() => {
        dispatch(actions.bulkDeleteGroup({ certificateUuids: uuids }));
        onUpdate();
    }, [dispatch, onUpdate, uuids]);

    const groupOptions = useMemo(() => {
        return groups.map((group) => ({ value: group.uuid, label: group.name }));
    }, [groups]);

    return (
        <>
            <div className="mb-4">
                <Select
                    id="group"
                    options={groupOptions}
                    value={selectedGroups || []}
                    placeholder="Select groups"
                    isMulti
                    label="Groups"
                    onChange={(values) => {
                        setSelectedGroups(values || []);
                    }}
                />
            </div>

            <Container className="flex-row justify-end modal-footer" gap={4}>
                <Button variant="outline" onClick={onCancel} className="mr-auto">
                    Cancel
                </Button>
                <Button color="danger" onClick={removeGroup} title="Remove groups from selected certificates">
                    Remove
                </Button>
                <Button
                    color="primary"
                    onClick={updateGroup}
                    disabled={!selectedGroups?.length}
                    title="Update groups for selected certificates"
                >
                    Update
                </Button>
            </Container>

            <Spinner active={isFetchingGroups} />
        </>
    );
}
