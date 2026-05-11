import AttributeEditor from 'components/Attributes/AttributeEditor';
import Spinner from 'components/Spinner';

import { actions as alertActions } from 'ducks/alerts';
import { actions as acmeProfilesActions, selectors as acmeProfilesSelectors } from 'ducks/acme-profiles';
import { actions as cmpProfilesActions, selectors as cmpProfilesSelectors } from 'ducks/cmp-profiles';
import { actions as raProfilesActions, selectors as raProfilesSelectors } from 'ducks/ra-profiles';
import { actions as scepProfilesActions, selectors as scepProfilesSelectors } from 'ducks/scep-profiles';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import Select from 'components/Select';
import Button from 'components/Button';
import type { AttributeDescriptorModel, AttributeRequestModel } from 'types/attributes';

import { collectFormAttributes } from 'utils/attributes/attributes';

import { buildValidationRules } from 'utils/validators-helper';
import { validateRequired } from 'utils/validators';
import TabLayout from '../../Layout/TabLayout';
import cn from 'classnames';
import Label from 'components/Label';
import Container from 'components/Container';

export enum Protocol {
    ACME = 'ACME',
    SCEP = 'SCEP',
    CMP = 'CMP',
}

type Props = Readonly<{
    protocol: Protocol;
    raProfileUuid?: string;
    authorityInstanceUuid?: string;
    visible: boolean;
    onClose: () => void;
}>;

export default function ProtocolActivationDialogBody({ protocol, raProfileUuid, authorityInstanceUuid, visible, onClose }: Props) {
    const dispatch = useDispatch();

    const acmeProfiles = useSelector(acmeProfilesSelectors.acmeProfiles);
    const scepProfiles = useSelector(scepProfilesSelectors.scepProfiles);
    const cmpProfiles = useSelector(cmpProfilesSelectors.cmpProfiles);

    const profiles = useMemo(() => {
        const profileMap = {
            [Protocol.ACME]: acmeProfiles,
            [Protocol.CMP]: cmpProfiles,
            [Protocol.SCEP]: scepProfiles,
        };
        return profileMap[protocol] ?? [];
    }, [protocol, acmeProfiles, cmpProfiles, scepProfiles]);

    const issuanceAttributes = useSelector(raProfilesSelectors.issuanceAttributes);
    const revocationAttributes = useSelector(raProfilesSelectors.revocationAttributes);

    const [issueGroupAttributesCallbackAttributes, setIssueGroupAttributesCallbackAttributes] = useState<AttributeDescriptorModel[]>([]);
    const [revokeGroupAttributesCallbackAttributes, setRevokeGroupAttributesCallbackAttributes] = useState<AttributeDescriptorModel[]>([]);

    const fetchingSelectorMap = {
        [Protocol.ACME]: acmeProfilesSelectors.isFetchingList,
        [Protocol.CMP]: cmpProfilesSelectors.isFetchingList,
        [Protocol.SCEP]: scepProfilesSelectors.isFetchingList,
    };
    const isFetchingProfiles = useSelector(fetchingSelectorMap[protocol] ?? (() => false));
    const isFetchingIssuanceAttributes = useSelector(raProfilesSelectors.isFetchingIssuanceAttributes);
    const isFetchingRevocationAttributes = useSelector(raProfilesSelectors.isFetchingRevocationAttributes);

    const isBusy = useMemo(
        () => isFetchingProfiles || isFetchingIssuanceAttributes || isFetchingRevocationAttributes,
        [isFetchingProfiles, isFetchingIssuanceAttributes, isFetchingRevocationAttributes],
    );

    useEffect(
        () => {
            if (!visible) return;

            const profileListActions = {
                [Protocol.ACME]: acmeProfilesActions.listAcmeProfiles,
                [Protocol.CMP]: cmpProfilesActions.listCmpProfiles,
                [Protocol.SCEP]: scepProfilesActions.listScepProfiles,
            };

            const profileAction = profileListActions[protocol];
            if (!profileAction) {
                dispatch(alertActions.error(`Unsupported protocol: ${protocol}`));
                return;
            }

            dispatch(profileAction());

            if (!raProfileUuid) return;

            dispatch(
                raProfilesActions.listIssuanceAttributeDescriptors({
                    authorityUuid: authorityInstanceUuid ?? '',
                    uuid: raProfileUuid,
                }),
            );
            dispatch(
                raProfilesActions.listRevocationAttributeDescriptors({
                    authorityUuid: authorityInstanceUuid ?? '',
                    uuid: raProfileUuid,
                }),
            );
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [visible],
    );

    const optionsForProfiles = useMemo(
        () =>
            profiles.map((profile) => ({
                value: profile.uuid,
                label: profile.name,
            })),
        [profiles],
    );

    const methods = useForm({
        mode: 'onTouched',
        defaultValues: {
            profiles: undefined as string | undefined,
        },
    });

    const { control, handleSubmit, formState, watch } = methods;

    const onActivateSubmit = useCallback(
        (values: { profiles: string | undefined }) => {
            if (!raProfileUuid || !values.profiles) return;

            const allValues = watch();
            const issuanceAttribs: AttributeRequestModel[] =
                issuanceAttributes && issuanceAttributes.length > 0
                    ? collectFormAttributes(
                          'issuanceAttributes',
                          [...(issuanceAttributes ?? []), ...issueGroupAttributesCallbackAttributes],
                          allValues,
                      ) || []
                    : [];

            const revocationAttribs: AttributeRequestModel[] =
                revocationAttributes && revocationAttributes.length > 0
                    ? collectFormAttributes(
                          'revocationAttributes',
                          [...(revocationAttributes ?? []), ...revokeGroupAttributesCallbackAttributes],
                          allValues,
                      ) || []
                    : [];

            const activationPayloadMap = {
                [Protocol.ACME]: raProfilesActions.activateAcme({
                    authorityUuid: authorityInstanceUuid || '',
                    uuid: raProfileUuid,
                    acmeProfileUuid: values.profiles,
                    raProfileActivateAcmeRequest: {
                        issueCertificateAttributes: issuanceAttribs,
                        revokeCertificateAttributes: revocationAttribs,
                    },
                }),
                [Protocol.CMP]: raProfilesActions.activateCmp({
                    authorityUuid: authorityInstanceUuid || '',
                    uuid: raProfileUuid,
                    cmpProfileUuid: values.profiles,
                    raProfileActivateCmpRequest: {
                        issueCertificateAttributes: issuanceAttribs,
                        revokeCertificateAttributes: revocationAttribs,
                    },
                }),
                [Protocol.SCEP]: raProfilesActions.activateScep({
                    authorityUuid: authorityInstanceUuid || '',
                    uuid: raProfileUuid,
                    scepProfileUuid: values.profiles,
                    raProfileActivateScepRequest: {
                        issueCertificateAttributes: issuanceAttribs,
                    },
                }),
            };

            if (activationPayloadMap[protocol]) {
                dispatch(activationPayloadMap[protocol]);
            } else {
                dispatch(alertActions.error(`Invalid protocol value: ${protocol}`));
            }

            onClose();
        },
        [
            dispatch,
            issuanceAttributes,
            revocationAttributes,
            issueGroupAttributesCallbackAttributes,
            revokeGroupAttributesCallbackAttributes,
            raProfileUuid,
            authorityInstanceUuid,
            onClose,
            protocol,
            watch,
        ],
    );

    if (!raProfileUuid) return <></>;

    const attributeTabs = [
        {
            title: 'Issue attributes',
            content:
                !issuanceAttributes || issuanceAttributes.length === 0 ? (
                    <></>
                ) : (
                    <AttributeEditor
                        id="issuanceAttributes"
                        attributeDescriptors={issuanceAttributes}
                        groupAttributesCallbackAttributes={issueGroupAttributesCallbackAttributes}
                        setGroupAttributesCallbackAttributes={setIssueGroupAttributesCallbackAttributes}
                    />
                ),
        },
    ];
    if (protocol === Protocol.ACME || protocol === Protocol.CMP) {
        attributeTabs.push({
            title: 'Revocation attributes',
            content:
                !revocationAttributes || revocationAttributes.length === 0 ? (
                    <></>
                ) : (
                    <AttributeEditor
                        id="revocationAttributes"
                        attributeDescriptors={revocationAttributes}
                        groupAttributesCallbackAttributes={revokeGroupAttributesCallbackAttributes}
                        setGroupAttributesCallbackAttributes={setRevokeGroupAttributesCallbackAttributes}
                    />
                ),
        });
    }

    return (
        <>
            <FormProvider {...methods}>
                <form onSubmit={handleSubmit(onActivateSubmit)}>
                    <Controller
                        name="profiles"
                        control={control}
                        rules={buildValidationRules([validateRequired()])}
                        render={({ field, fieldState }) => (
                            <div className="mb-4">
                                <Label htmlFor="profilesSelect" className="block text-sm font-medium mb-2 text-gray-700 dark:text-white">
                                    {`Select ${protocol} profile`}
                                </Label>

                                <Select
                                    id="profilesSelect"
                                    options={optionsForProfiles}
                                    value={field.value}
                                    onChange={(value) => field.onChange(value)}
                                    placeholder={`Select ${protocol} profile to be activated`}
                                    className={cn({
                                        'border-red-500': fieldState.error && fieldState.isTouched,
                                    })}
                                />

                                {fieldState.error && fieldState.isTouched && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {typeof fieldState.error === 'string'
                                            ? fieldState.error
                                            : fieldState.error?.message || 'Required Field'}
                                    </p>
                                )}
                            </div>
                        )}
                    />
                    <br />

                    <TabLayout tabs={attributeTabs} />

                    <Container className="flex-row justify-end modal-footer" gap={4}>
                        <Button type="button" variant="outline" color="secondary" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            color="primary"
                            disabled={formState.isSubmitting || !formState.isValid}
                            onClick={handleSubmit(onActivateSubmit)}
                        >
                            Activate
                        </Button>
                    </Container>
                </form>
            </FormProvider>

            <Spinner active={isBusy} />
        </>
    );
}
