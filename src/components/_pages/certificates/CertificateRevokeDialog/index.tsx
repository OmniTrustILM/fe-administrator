import AttributeEditor from 'components/Attributes/AttributeEditor';
import Button from 'components/Button';
import Container from 'components/Container';
import Select from 'components/Select';
import Switch from 'components/Switch';
import Widget from 'components/Widget';
import { actions as certificateActions, selectors as certificateSelectors } from 'ducks/certificates';
import { selectors as enumSelectors, getEnumDescription } from 'ducks/enums';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, type FieldValues, FormProvider, useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import type { AttributeDescriptorModel } from 'types/attributes';
import type { CertificateDetailResponseModel } from 'types/certificate';
import { CertificateRevocationReason, PlatformEnum, Resource } from 'types/openapi';
import { collectFormAttributes } from 'utils/attributes/attributes';

interface FormValues {
    reason?: CertificateRevocationReason;
    destroyKey?: boolean;
}

type Props = Readonly<{
    certificate: CertificateDetailResponseModel;
    onClose: () => void;
}>;

export default function CertificateRevokeDialog({ certificate, onClose }: Props) {
    const dispatch = useDispatch();

    const revocationAttributes = useSelector(certificateSelectors.revocationAttributes);
    const isFetchingRevocationAttributes = useSelector(certificateSelectors.isFetchingRevocationAttributes);
    const certificateRevocationReason = useSelector(enumSelectors.platformEnum(PlatformEnum.CertificateRevocationReason));

    const [groupAttributesCallbackAttributes, setGroupAttributesCallbackAttributes] = useState<AttributeDescriptorModel[]>([]);

    const raProfileUuid = certificate.raProfile?.uuid;
    const authorityUuid = certificate.raProfile?.authorityInstanceUuid;

    useEffect(() => {
        dispatch(certificateActions.clearRevocationAttributes());
        if (raProfileUuid && authorityUuid) {
            dispatch(certificateActions.getRevocationAttributes({ raProfileUuid, authorityUuid }));
        }
        return () => {
            dispatch(certificateActions.clearRevocationAttributes());
        };
    }, [dispatch, raProfileUuid, authorityUuid]);

    const reasonOptions = useMemo(() => {
        if (!certificateRevocationReason) return [];
        return Object.keys(certificateRevocationReason)
            .map((key) => ({
                value: certificateRevocationReason[key].code,
                label: certificateRevocationReason[key].label,
                description: getEnumDescription(certificateRevocationReason, certificateRevocationReason[key].code),
            }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [certificateRevocationReason]);

    const methods = useForm<FormValues>({ mode: 'onTouched', defaultValues: { destroyKey: false } });
    const { control, handleSubmit } = methods;

    const onSubmit = useCallback(
        (values: FormValues) => {
            dispatch(
                certificateActions.revokeCertificate({
                    uuid: certificate.uuid,
                    revokeRequest: {
                        reason: values.reason || CertificateRevocationReason.Unspecified,
                        attributes: collectFormAttributes(
                            'revoke',
                            [...revocationAttributes, ...groupAttributesCallbackAttributes],
                            values as FieldValues,
                        ),
                        destroyKey: certificate.key ? !!values.destroyKey : undefined,
                    },
                    raProfileUuid: raProfileUuid || '',
                    authorityUuid: authorityUuid || '',
                }),
            );
            onClose();
        },
        [certificate, dispatch, revocationAttributes, groupAttributesCallbackAttributes, raProfileUuid, authorityUuid, onClose],
    );

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)}>
                <Widget noBorder busy={isFetchingRevocationAttributes}>
                    <div className="space-y-4">
                        <Controller
                            name="reason"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    id="revokeReason"
                                    options={reasonOptions}
                                    placeholder="Select Revocation Reason"
                                    value={field.value || ''}
                                    onChange={(value) => field.onChange(value as CertificateRevocationReason)}
                                    label="Revocation Reason"
                                    showOptionDescriptionInDropdown
                                    showSelectedDescriptionAsHelp
                                />
                            )}
                        />

                        {!isFetchingRevocationAttributes && revocationAttributes.length > 0 && (
                            <AttributeEditor
                                id="revoke"
                                attributeDescriptors={revocationAttributes}
                                callbackParentUuid={raProfileUuid}
                                callbackResource={Resource.Certificates}
                                groupAttributesCallbackAttributes={groupAttributesCallbackAttributes}
                                setGroupAttributesCallbackAttributes={setGroupAttributesCallbackAttributes}
                            />
                        )}

                        {certificate.key && (
                            <Controller
                                name="destroyKey"
                                control={control}
                                render={({ field }) => (
                                    <Switch
                                        id="destroyKey"
                                        label="Destroy key on revocation"
                                        checked={field.value || false}
                                        onChange={field.onChange}
                                    />
                                )}
                            />
                        )}

                        <Container className="flex-row justify-end modal-footer" gap={4}>
                            <Button variant="outline" onClick={onClose} type="button">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isFetchingRevocationAttributes} data-testid="revokeSubmit">
                                Revoke
                            </Button>
                        </Container>
                    </div>
                </Widget>
            </form>
        </FormProvider>
    );
}
