import RequestAttributeAuthoringEditor from 'components/RequestAttributes/RequestAttributeAuthoringEditor';
import { useOidMappingOptions } from 'components/RequestAttributes/useOidMappingOptions';
import { actions as authoritiesActions, selectors as authoritiesSelectors } from 'ducks/authorities';
import { actions as requestAttributesActions, selectors as requestAttributesSelectors } from 'ducks/raProfileRequestAttributes';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RaProfileCertificateRequestAttributesDto } from 'types/openapi';
import { isGroupAttributeModel } from 'types/attributes';
import { useRunOnFailedFinish, useRunOnSuccessfulFinish } from 'utils/common-hooks';
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

    const { rdnOptions, extensionOptions, rdnOptionsError, extensionOptionsError, rdnOptionsLoaded, extensionOptionsLoaded } =
        useOidMappingOptions();

    const raProfileAttributeDescriptors = useSelector(authoritiesSelectors.raProfileAttributeDescriptors);

    const isUpdating = useSelector(requestAttributesSelectors.isUpdatingRaProfileSet);
    const updateSucceeded = useSelector(requestAttributesSelectors.updateRaProfileSetSucceeded);
    const updateError = useSelector(requestAttributesSelectors.updateRaProfileSetError);

    const [form, setForm] = useState<RequestAttributeAuthoringFormValues>(() =>
        gateMergeModeAndBindings(parseRaProfileRequestAttributesDto(certificateRequestAttributes)),
    );
    const [dirty, setDirty] = useState(false);

    useEffect(() => {
        if (MERGE_MODE_AND_BINDINGS_ENABLED && authorityUuid) {
            dispatch(authoritiesActions.getRAProfilesAttributesDescriptors({ authorityUuid }));
        }
    }, [dispatch, authorityUuid]);

    useEffect(() => {
        if (dirty) return;
        setForm(gateMergeModeAndBindings(parseRaProfileRequestAttributesDto(certificateRequestAttributes)));
    }, [certificateRequestAttributes, dirty]);

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

    const onChange = useCallback(
        (next: RequestAttributeAuthoringFormValues) => {
            setForm(next);
            setDirty(true);
            dispatch(
                requestAttributesActions.updateRaProfileRequestAttributes({
                    authorityUuid,
                    raProfileUuid,
                    data: buildRaProfileRequestAttributesUpdateDto(gateMergeModeAndBindings(next)),
                }),
            );
        },
        [dispatch, authorityUuid, raProfileUuid],
    );

    const clearDirtyAndRefetch = useCallback(() => {
        setDirty(false);
        onSaved?.();
    }, [onSaved]);
    useRunOnSuccessfulFinish(isUpdating, updateSucceeded, clearDirtyAndRefetch);

    // A rejected save persisted nothing, so drop the optimistic edit: the props still hold the last set
    // Core accepted, and clearing `dirty` unblocks the re-seed effect.
    const revertToPersisted = useCallback(() => {
        setForm(gateMergeModeAndBindings(parseRaProfileRequestAttributesDto(certificateRequestAttributes)));
        setDirty(false);
    }, [certificateRequestAttributes]);
    useRunOnFailedFinish(isUpdating, updateSucceeded, revertToPersisted);

    return (
        <div className="space-y-4" data-testid="ra-profile-request-attributes-widget">
            {updateError && (
                <div
                    className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-800/10 dark:text-red-500"
                    data-testid="request-attributes-update-error"
                    role="alert"
                >
                    {`The change was rejected and has not been saved: ${updateError}`}
                </div>
            )}
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
                rdnOptionsError={rdnOptionsError}
                extensionOptionsError={extensionOptionsError}
                rdnOptionsLoaded={rdnOptionsLoaded}
                extensionOptionsLoaded={extensionOptionsLoaded}
                disabled={disabled || isUpdating}
            />
        </div>
    );
}
