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
    hasAuthoredRequestAttributes,
    parseRaProfileRequestAttributesDto,
    type RequestAttributeAuthoringFormValues,
} from 'utils/requestAttributeAuthoring';

type Props = Readonly<{
    authorityUuid: string;
    raProfileUuid: string;
    certificateRequestAttributes?: RaProfileCertificateRequestAttributesDto;
    disabled?: boolean;
}>;

export default function RaProfileRequestAttributesWidget({
    authorityUuid,
    raProfileUuid,
    certificateRequestAttributes,
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
        parseRaProfileRequestAttributesDto(certificateRequestAttributes),
    );
    const [dirty, setDirty] = useState(false);

    // The descriptors live in a shared slice, so drop the previous authority's set before fetching:
    // otherwise the binding picker offers the old connector's fields until the new response lands.
    useEffect(() => {
        if (authorityUuid) {
            dispatch(authoritiesActions.clearRAProfilesAttributesDescriptors());
            dispatch(authoritiesActions.getRAProfilesAttributesDescriptors({ authorityUuid }));
        }
    }, [dispatch, authorityUuid]);

    useEffect(() => {
        if (dirty) return;
        setForm(parseRaProfileRequestAttributesDto(certificateRequestAttributes));
    }, [certificateRequestAttributes, dirty]);

    const connectorAttributeOptions = useMemo(
        () =>
            (raProfileAttributeDescriptors ?? []).map((descriptor) => ({
                value: descriptor.uuid ?? descriptor.name,
                label: isGroupAttributeModel(descriptor) ? descriptor.name : (descriptor.properties?.label ?? descriptor.name),
                description: descriptor.name,
            })),
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
                    data: buildRaProfileRequestAttributesUpdateDto(next),
                }),
            );
        },
        [dispatch, authorityUuid, raProfileUuid],
    );

    // The epic patches `certificateRequestAttributes` in the raprofiles slice from the PATCH response,
    // so clearing `dirty` is all it takes for the re-seed effect above to pick up the persisted set.
    const clearDirty = useCallback(() => setDirty(false), []);
    useRunOnSuccessfulFinish(isUpdating, updateSucceeded, clearDirty);

    // A rejected save persisted nothing, so drop the optimistic edit: the props still hold the last set
    // Core accepted, and clearing `dirty` unblocks the re-seed effect.
    const revertToPersisted = useCallback(() => {
        setForm(parseRaProfileRequestAttributesDto(certificateRequestAttributes));
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
                showMergeMode
                showBindings
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
