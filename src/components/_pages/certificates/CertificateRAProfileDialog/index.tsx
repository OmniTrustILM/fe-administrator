import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { actions } from 'ducks/certificates';
import { actions as raProfileActions, selectors as raProfileSelectors } from 'ducks/ra-profiles';

import Select from 'components/Select';

import Spinner from 'components/Spinner';
import Button from 'components/Button';
import Container from 'components/Container';

type Props = {
    uuids: string[];
    onCancel: () => void;
    onUpdate: () => void;
};

export default function CertificateGroupDialog({ uuids, onCancel, onUpdate }: Readonly<Props>) {
    const dispatch = useDispatch();

    const raProfiles = useSelector(raProfileSelectors.raProfiles);

    const isFetchingRaProffiles = useSelector(raProfileSelectors.isFetchingList);

    const [selectedRaProfile, setSelectedRaProfile] = useState<string>();

    useEffect(() => {
        dispatch(raProfileActions.listRaProfiles());
    }, [dispatch]);

    const removeRaprofile = useCallback(() => {
        dispatch(actions.bulkDeleteRaProfile({ certificateUuids: uuids }));
        onUpdate();
    }, [dispatch, onUpdate, uuids]);

    const updateRaProfile = useCallback(() => {
        if (!selectedRaProfile) return;
        dispatch(
            actions.bulkUpdateRaProfile({
                raProfileRequest: { certificateUuids: uuids, raProfileUuid: selectedRaProfile.split(':#')[0], filters: [] },
                authorityUuid: selectedRaProfile.split(':#')[1],
            }),
        );
        onUpdate();
    }, [dispatch, onUpdate, selectedRaProfile, uuids]);

    return (
        <>
            <div className="mb-4">
                <Select
                    id="raProfile"
                    options={raProfiles.map((raProfile) => ({
                        value: raProfile.uuid + ':#' + raProfile.authorityInstanceUuid,
                        label: raProfile.name,
                    }))}
                    value={selectedRaProfile || ''}
                    onChange={(value) => setSelectedRaProfile(value as string)}
                    label="RA Profile"
                />
            </div>

            <Container className="flex-row justify-end modal-footer" gap={4}>
                <Button color="secondary" variant="outline" onClick={onCancel} className="mr-auto">
                    Cancel
                </Button>
                <Button color="danger" onClick={removeRaprofile}>
                    Remove
                </Button>
                <Button color="primary" onClick={updateRaProfile} disabled={!selectedRaProfile}>
                    Update
                </Button>
            </Container>

            <Spinner active={isFetchingRaProffiles} />
        </>
    );
}
