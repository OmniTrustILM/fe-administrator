import ProgressButton from 'components/ProgressButton';
import RequestAttributeAuthoringEditor from 'components/RequestAttributes/RequestAttributeAuthoringEditor';
import { actions as authoritiesActions, selectors as authoritiesSelectors } from 'ducks/authorities';
import { actions as oidActions, selectors as oidSelectors } from 'ducks/oids';
import { actions as requestAttributesActions, selectors as requestAttributesSelectors } from 'ducks/raProfileRequestAttributes';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RaProfileCertificateRequestAttributesDto } from 'types/openapi';
import { OidCategory } from 'types/openapi';
import { isGroupAttributeModel } from 'types/attributes';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { toOidSelectOptions } from 'utils/oid';
import {
    buildRaProfileRequestAttributesUpdateDto,
    gateMergeModeAndBindings,
    hasAuthoredRequestAttributes,
    MERGE_MODE_AND_BINDINGS_ENABLED,
    parseRaProfileRequestAttributesDto,
    type RequestAttributeAuthoringFormValues,
} from 'utils/requestAttributeAuthoring';

type Props = Readonly<{
    authorityUuid: string;
    raProfileUuid: string;
    certificateRequestAttributes?: RaProfileCertificateRequestAttributesDto;
    onSaved?: () => void;
    disabled?: boolean;
}>;

export default function RaProfileRequestAttributesWidget({
    authorityUuid,
    raProfileUuid,
    certificateRequestAttributes,
    onSaved,
    disabled = false,
}: Props) {
    const dispatch = useDispatch();

    const oidsByCategory = useSelector(oidSelectors.oidsByCategory);
    const oidsByCategoryError = useSelector(oidSelectors.oidsByCategoryError);
    const oidsByCategoryLoaded = useSelector(oidSelectors.oidsByCategoryLoaded);
    const systemOidsByCategory = useSelector(oidSelectors.systemOidsByCategory);
    const systemOidsError = useSelector(oidSelectors.systemOidsError);
    const systemOidsLoaded = useSelector(oidSelectors.systemOidsLoaded);

    const raProfileAttributeDescriptors = useSelector(authoritiesSelectors.raProfileAttributeDescriptors);

    const isUpdating = useSelector(requestAttributesSelectors.isUpdatingRaProfileSet);
    const updateSucceeded = useSelector(requestAttributesSelectors.updateRaProfileSetSucceeded);

    const [form, setForm] = useState<RequestAttributeAuthoringFormValues>(() =>
        gateMergeModeAndBindings(parseRaProfileRequestAttributesDto(certificateRequestAttributes)),
    );
    const [dirty, setDirty] = useState(false);

    useEffect(() => {
        dispatch(oidActions.listOidsByCategory({ category: OidCategory.RdnAttributeType }));
        dispatch(oidActions.listOidsByCategory({ category: OidCategory.CertificateExtension }));
        dispatch(oidActions.listSystemOids());
    }, [dispatch]);

    useEffect(() => {
        if (MERGE_MODE_AND_BINDINGS_ENABLED && authorityUuid) {
            dispatch(authoritiesActions.getRAProfilesAttributesDescriptors({ authorityUuid }));
        }
    }, [dispatch, authorityUuid]);

    useEffect(() => {
        if (dirty) return;
        setForm(gateMergeModeAndBindings(parseRaProfileRequestAttributesDto(certificateRequestAttributes)));
    }, [certificateRequestAttributes, dirty]);

    const rdnOptions = useMemo(
        () =>
            toOidSelectOptions([
                ...(systemOidsByCategory[OidCategory.RdnAttributeType] ?? []),
                ...(oidsByCategory[OidCategory.RdnAttributeType] ?? []),
            ]),
        [systemOidsByCategory, oidsByCategory],
    );
    const extensionOptions = useMemo(() => toOidSelectOptions(oidsByCategory[OidCategory.CertificateExtension] ?? []), [oidsByCategory]);
    const connectorAttributeOptions = useMemo(
        () =>
            MERGE_MODE_AND_BINDINGS_ENABLED
                ? (raProfileAttributeDescriptors ?? []).map((descriptor) => ({
                      value: descriptor.uuid ?? descriptor.name,
                      label: !isGroupAttributeModel(descriptor) ? (descriptor.properties?.label ?? descriptor.name) : descriptor.name,
                      description: descriptor.name,
                  }))
                : [],
        [raProfileAttributeDescriptors],
    );

    const showPlatformDefaultNote = useMemo(() => !hasAuthoredRequestAttributes(form), [form]);

    const onChange = useCallback((next: RequestAttributeAuthoringFormValues) => {
        setForm(next);
        setDirty(true);
    }, []);

    const clearDirtyAndRefetch = useCallback(() => {
        setDirty(false);
        onSaved?.();
    }, [onSaved]);
    useRunOnSuccessfulFinish(isUpdating, updateSucceeded, clearDirtyAndRefetch);

    const onSave = useCallback(() => {
        dispatch(
            requestAttributesActions.updateRaProfileRequestAttributes({
                authorityUuid,
                raProfileUuid,
                data: buildRaProfileRequestAttributesUpdateDto(gateMergeModeAndBindings(form)),
            }),
        );
    }, [dispatch, authorityUuid, raProfileUuid, form]);

    return (
        <div className="space-y-4" data-testid="ra-profile-request-attributes-widget">
            {showPlatformDefaultNote && (
                <p className="text-sm text-gray-500" data-testid="request-attributes-platform-default-note">
                    No request attributes are defined for this RA profile. The set of request attributes defined in platform settings will
                    be used instead.
                </p>
            )}
            <RequestAttributeAuthoringEditor
                value={form}
                onChange={onChange}
                showMergeMode={MERGE_MODE_AND_BINDINGS_ENABLED}
                showBindings={MERGE_MODE_AND_BINDINGS_ENABLED}
                connectorAttributeOptions={connectorAttributeOptions}
                rdnOptions={rdnOptions}
                extensionOptions={extensionOptions}
                rdnOptionsError={!!oidsByCategoryError[OidCategory.RdnAttributeType] || systemOidsError}
                extensionOptionsError={!!oidsByCategoryError[OidCategory.CertificateExtension]}
                rdnOptionsLoaded={!!oidsByCategoryLoaded[OidCategory.RdnAttributeType] && systemOidsLoaded}
                extensionOptionsLoaded={!!oidsByCategoryLoaded[OidCategory.CertificateExtension]}
                disabled={disabled || isUpdating}
            />
            <div className="flex justify-end">
                <ProgressButton
                    title="Save"
                    inProgressTitle="Saving..."
                    inProgress={isUpdating}
                    disabled={!dirty || isUpdating || disabled}
                    onClick={onSave}
                    type="button"
                />
            </div>
        </div>
    );
}
