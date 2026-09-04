import RequestAttributeAuthoringEditor from 'components/RequestAttributes/RequestAttributeAuthoringEditor';
import ResolvedRequestAttributesPreview from 'components/RequestAttributes/ResolvedRequestAttributesPreview';
import { useKeyUsageOptions } from 'components/RequestAttributes/useKeyUsageOptions';
import { useOidMappingOptions } from 'components/RequestAttributes/useOidMappingOptions';
import { actions as authoritiesActions, selectors as authoritiesSelectors } from 'ducks/authorities';
import { actions as certificatesActions, selectors as certificatesSelectors } from 'ducks/certificates';
import { actions as requestAttributesActions, selectors as requestAttributesSelectors } from 'ducks/raProfileRequestAttributes';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';
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

    const {
        rdnOptions,
        extensionOptions,
        extendedKeyUsageOptions,
        rdnOptionsError,
        extensionOptionsError,
        extendedKeyUsageOptionsError,
        rdnOptionsLoaded,
        extensionOptionsLoaded,
        extendedKeyUsageOptionsLoaded,
    } = useOidMappingOptions();
    const keyUsageOptions = useKeyUsageOptions();

    const raProfileAttributeDescriptors = useSelector(authoritiesSelectors.raProfileAttributeDescriptors);

    const isUpdating = useSelector(requestAttributesSelectors.isUpdatingRaProfileSet);
    const updateSucceeded = useSelector(requestAttributesSelectors.updateRaProfileSetSucceeded);
    const updateError = useSelector(requestAttributesSelectors.updateRaProfileSetError);

    const resolvedSet = useSelector(certificatesSelectors.csrAttributeDescriptors);
    const isFetchingResolvedSet = useSelector(certificatesSelectors.isFetchingCsrAttributes);
    const resolvedSetError = useSelector(certificatesSelectors.csrAttributesError);

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
                      label: isGroupAttributeModel(descriptor) ? descriptor.name : (descriptor.properties?.label ?? descriptor.name),
                      description: descriptor.name,
                  }))
                : [],
        [raProfileAttributeDescriptors],
    );

    const showPlatformDefaultNote = useMemo(() => !hasAuthoredRequestAttributes(form), [form]);

    // Under strict validation any unmapped extension is rejected, so before deciding whether to
    // author a per-profile set the operator needs to see what the fallback actually resolves to.
    // `GET /v1/certificates/csr/attributes?raProfileUuid=` returns exactly that resolved set.
    useEffect(() => {
        if (showPlatformDefaultNote && raProfileUuid) {
            dispatch(certificatesActions.getCsrAttributes({ raProfileUuid }));
        }
    }, [dispatch, showPlatformDefaultNote, raProfileUuid]);

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
                    className="rounded-lg border border-danger bg-danger-surface p-3 text-sm text-danger"
                    data-testid="request-attributes-update-error"
                    role="alert"
                >
                    {`The change was rejected and has not been saved: ${updateError}`}
                </div>
            )}
            {showPlatformDefaultNote && (
                <div className="space-y-2">
                    <p className="text-sm text-content-subtle" data-testid="request-attributes-platform-default-note">
                        No request attributes are defined for this RA profile. The set of request attributes defined in{' '}
                        <Link className="text-brand hover:text-brand-hover underline" to="/settings?tab=request-attributes">
                            platform settings
                        </Link>{' '}
                        will be used instead, resolving to:
                    </p>
                    <ResolvedRequestAttributesPreview
                        descriptors={resolvedSet}
                        isFetching={isFetchingResolvedSet}
                        fetchFailed={!!resolvedSetError}
                    />
                </div>
            )}
            <RequestAttributeAuthoringEditor
                value={form}
                onChange={onChange}
                showMergeMode={MERGE_MODE_AND_BINDINGS_ENABLED}
                showBindings={MERGE_MODE_AND_BINDINGS_ENABLED}
                connectorAttributeOptions={connectorAttributeOptions}
                rdnOptions={rdnOptions}
                extensionOptions={extensionOptions}
                extendedKeyUsageOptions={extendedKeyUsageOptions}
                keyUsageOptions={keyUsageOptions}
                rdnOptionsError={rdnOptionsError}
                extensionOptionsError={extensionOptionsError}
                extendedKeyUsageOptionsError={extendedKeyUsageOptionsError}
                rdnOptionsLoaded={rdnOptionsLoaded}
                extensionOptionsLoaded={extensionOptionsLoaded}
                extendedKeyUsageOptionsLoaded={extendedKeyUsageOptionsLoaded}
                disabled={disabled || isUpdating}
                persist={{ pending: isUpdating, error: updateError }}
            />
        </div>
    );
}
