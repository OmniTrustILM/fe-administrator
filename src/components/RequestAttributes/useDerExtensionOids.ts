import { actions as oidActions, selectors as oidSelectors } from 'ducks/oids';
import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ExtensionValueEncoding, OidCategory } from 'types/openapi';
import { isCertificateExtensionProperties } from 'utils/oid';

/**
 * The dotted OIDs of every registered certificate extension (system + custom) whose value encoding
 * is DER. Whether an extension-mapped attribute accepts a structural ASN.1 JSON tree comes from the
 * OID registry, and only DER-encoded extensions do — for the string encodings a value starting with
 * `{` is literal text, so offering JSON validation there would reject valid values.
 */
export function useDerExtensionOids(enabled: boolean): Set<string> {
    const dispatch = useDispatch();
    const systemOidsByCategory = useSelector(oidSelectors.systemOidsByCategory);
    const oidsByCategory = useSelector(oidSelectors.oidsByCategory);

    useEffect(() => {
        if (!enabled) return;
        // Both fetches are cheap on remount: the system list is cached by the epic, and repeated
        // dispatches of the same custom category collapse via switchMap.
        dispatch(oidActions.listSystemOids());
        dispatch(oidActions.listOidsByCategory({ category: OidCategory.CertificateExtension }));
    }, [dispatch, enabled]);

    return useMemo(() => {
        const derOids = new Set<string>();
        const entries = [
            ...(systemOidsByCategory[OidCategory.CertificateExtension] ?? []),
            ...(oidsByCategory[OidCategory.CertificateExtension] ?? []),
        ];
        for (const entry of entries) {
            if (
                isCertificateExtensionProperties(entry.additionalProperties) &&
                entry.additionalProperties.valueEncoding === ExtensionValueEncoding.Der
            ) {
                derOids.add(entry.oid);
            }
        }
        return derOids;
    }, [systemOidsByCategory, oidsByCategory]);
}
