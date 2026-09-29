import Button from 'components/Button';
import Container from 'components/Container';
import TabLayout from 'components/Layout/TabLayout';
import Select from 'components/Select';
import Spinner from 'components/Spinner';
import { actions, selectors } from 'ducks/certificates';
import { actions as raProfileActions, selectors as raProfileSelectors } from 'ducks/ra-profiles';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { type FieldValues, FormProvider, useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import type { CertificateDetailResponseModel } from 'types/certificate';
import OperationAttributesEditor from '../OperationAttributesEditor';
import { useOperationAttributes } from '../OperationAttributesEditor/useOperationAttributes';

export type RaProfileTarget = { kind: 'certificate'; certificate: CertificateDetailResponseModel } | { kind: 'selection'; uuids: string[] };

type Props = Readonly<{
    target: RaProfileTarget;
    onCancel: () => void;
    onUpdate: () => void;
}>;

type Selection = { raProfileUuid: string; authorityUuid: string };

const optionValue = (selection: Selection) => `${selection.raProfileUuid}:#${selection.authorityUuid}`;

const parseOptionValue = (value: string): Selection | undefined => {
    const [raProfileUuid, authorityUuid] = value.split(':#');
    return raProfileUuid && authorityUuid ? { raProfileUuid, authorityUuid } : undefined;
};

const currentSelection = (target: RaProfileTarget): Selection | undefined => {
    const raProfile = target.kind === 'certificate' ? target.certificate.raProfile : undefined;
    return raProfile?.uuid && raProfile.authorityInstanceUuid
        ? { raProfileUuid: raProfile.uuid, authorityUuid: raProfile.authorityInstanceUuid }
        : undefined;
};

export default function CertificateRAProfileDialog({ target, onCancel, onUpdate }: Props) {
    const dispatch = useDispatch();

    const raProfiles = useSelector(raProfileSelectors.raProfiles);
    const isFetchingRaProfiles = useSelector(raProfileSelectors.isFetchingList);
    const isUpdatingRaProfile = useSelector(selectors.isUpdatingRaProfile);

    const current = useMemo(() => currentSelection(target), [target]);
    const [selected, setSelected] = useState<Selection | undefined>(current);

    // A switch to the profile the certificate already has is a no-op, so there is nothing to identify.
    const assigned = selected?.raProfileUuid !== current?.raProfileUuid ? selected : undefined;
    const identify = useOperationAttributes('identify', assigned?.raProfileUuid, assigned?.authorityUuid);

    useEffect(() => {
        dispatch(raProfileActions.listRaProfiles());
    }, [dispatch]);

    const options = useMemo(
        () =>
            raProfiles.map((raProfile) => ({
                value: optionValue({ raProfileUuid: raProfile.uuid, authorityUuid: raProfile.authorityInstanceUuid ?? '' }),
                label: raProfile.name,
            })),
        [raProfiles],
    );

    const methods = useForm<FieldValues>({ mode: 'onTouched' });

    const removeRaProfile = useCallback(() => {
        if (target.kind !== 'selection') return;
        dispatch(actions.bulkDeleteRaProfile({ certificateUuids: target.uuids }));
        onUpdate();
    }, [dispatch, onUpdate, target]);

    const onSubmit = useCallback(
        (values: FieldValues) => {
            if (!selected) return;
            const attributes = identify.collect(values);
            if (target.kind === 'certificate') {
                dispatch(
                    actions.updateRaProfile({
                        uuid: target.certificate.uuid,
                        updateRaProfileRequest: { raProfileUuid: selected.raProfileUuid, attributes },
                        authorityUuid: selected.authorityUuid,
                    }),
                );
            } else {
                dispatch(
                    actions.bulkUpdateRaProfile({
                        raProfileRequest: {
                            certificateUuids: target.uuids,
                            raProfileUuid: selected.raProfileUuid,
                            filters: [],
                            attributes,
                        },
                        authorityUuid: selected.authorityUuid,
                    }),
                );
            }
            onUpdate();
        },
        [dispatch, identify, onUpdate, selected, target],
    );

    return (
        <FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit(onSubmit)}>
                <div className="mb-4">
                    <Select
                        id="raProfile"
                        options={options}
                        value={selected ? optionValue(selected) : ''}
                        onChange={(value) => setSelected(typeof value === 'string' ? parseOptionValue(value) : undefined)}
                        placeholder="Select RA Profile"
                        label="RA Profile"
                    />
                </div>

                {identify.descriptors.length > 0 && (
                    <TabLayout
                        noBorder
                        tabs={[{ title: 'Identify Attributes', content: <OperationAttributesEditor attributes={identify} /> }]}
                    />
                )}

                <Container className="flex-row justify-end modal-footer" gap={4}>
                    <Button color="secondary" variant="outline" onClick={onCancel} className="mr-auto" type="button">
                        Cancel
                    </Button>
                    {target.kind === 'selection' && (
                        <Button color="danger" onClick={removeRaProfile} type="button">
                            Remove
                        </Button>
                    )}
                    <Button
                        color="primary"
                        type="submit"
                        disabled={!selected || isUpdatingRaProfile || identify.isFetching}
                        data-testid="raProfileSubmit"
                    >
                        Update
                    </Button>
                </Container>

                <Spinner active={isFetchingRaProfiles} />
            </form>
        </FormProvider>
    );
}
