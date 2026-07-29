import { actions as oidActions, selectors as oidSelectors } from 'ducks/oids';
import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { OidCategory } from 'types/openapi';
import { toMergedOidSelectOptions, type OidSelectOption } from 'utils/oid';

export type OidMappingOptions = {
    rdnOptions: OidSelectOption[];
    extensionOptions: OidSelectOption[];
    rdnOptionsError: boolean;
    extensionOptionsError: boolean;
    rdnOptionsLoaded: boolean;
    extensionOptionsLoaded: boolean;
};

/**
 * Fetches and derives the RDN / certificate-extension option lists for the request-attribute
 * authoring editor. Standard entries (RDNs such as CN/O/OU, extensions such as Extended Key Usage)
 * live in the backend's system registry rather than in /v1/oids/list, so both targets merge the
 * cached system list with the per-category custom list.
 */
export function useOidMappingOptions(): OidMappingOptions {
    const dispatch = useDispatch();

    const oidsByCategory = useSelector(oidSelectors.oidsByCategory);
    const oidsByCategoryError = useSelector(oidSelectors.oidsByCategoryError);
    const oidsByCategoryLoaded = useSelector(oidSelectors.oidsByCategoryLoaded);
    const systemOidsByCategory = useSelector(oidSelectors.systemOidsByCategory);
    const systemOidsError = useSelector(oidSelectors.systemOidsError);
    const systemOidsLoaded = useSelector(oidSelectors.systemOidsLoaded);

    useEffect(() => {
        dispatch(oidActions.listOidsByCategory({ category: OidCategory.RdnAttributeType }));
        dispatch(oidActions.listOidsByCategory({ category: OidCategory.CertificateExtension }));
        // The epic caches the (category-unfiltered) system list once, so this is cheap on remount.
        dispatch(oidActions.listSystemOids());
    }, [dispatch]);

    const rdnOptions = useMemo(
        () => toMergedOidSelectOptions(systemOidsByCategory[OidCategory.RdnAttributeType], oidsByCategory[OidCategory.RdnAttributeType]),
        [systemOidsByCategory, oidsByCategory],
    );

    const extensionOptions = useMemo(
        () =>
            toMergedOidSelectOptions(
                systemOidsByCategory[OidCategory.CertificateExtension],
                oidsByCategory[OidCategory.CertificateExtension],
            ),
        [systemOidsByCategory, oidsByCategory],
    );

    return {
        rdnOptions,
        extensionOptions,
        rdnOptionsError: !!oidsByCategoryError[OidCategory.RdnAttributeType] || systemOidsError,
        extensionOptionsError: !!oidsByCategoryError[OidCategory.CertificateExtension] || systemOidsError,
        rdnOptionsLoaded: !!oidsByCategoryLoaded[OidCategory.RdnAttributeType] && systemOidsLoaded,
        extensionOptionsLoaded: !!oidsByCategoryLoaded[OidCategory.CertificateExtension] && systemOidsLoaded,
    };
}
