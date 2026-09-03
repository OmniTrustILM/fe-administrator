import { actions as oidActions, selectors as oidSelectors } from 'ducks/oids';
import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ExtensionValueEncoding, OidCategory } from 'types/openapi';
import { isCertificateExtensionProperties } from 'utils/oid';

/**
 * Fetches the certificate-extension OID registry (system + custom). Call once per form — e.g. from
 * the attribute editor — not per field: every rendered field dispatching its own fetch would fire a
 * burst of parallel requests the epics then have to cancel.
 */
export function useFetchExtensionOidRegistry(enabled: boolean): void {
    const dispatch = useDispatch();

    useEffect(() => {
        if (!enabled) return;
        // Both fetches are cheap on remount: the system list is cached by the epic, and repeated
        // dispatches of the same custom category collapse via switchMap.
        dispatch(oidActions.listSystemOids());
        dispatch(oidActions.listOidsByCategory({ category: OidCategory.CertificateExtension }));
    }, [dispatch, enabled]);
}

/**
 * The dotted OIDs of every registered certificate extension (system + custom) whose value encoding
 * is DER. Whether an extension-mapped attribute accepts a structural ASN.1 JSON tree comes from the
 * OID registry, and only DER-encoded extensions do — for the string encodings a value starting with
 * `{` is literal text, so offering JSON validation there would reject valid values.
 *
 * Selection only; the registry fetch is `useFetchExtensionOidRegistry`.
 */
export function useDerExtensionOids(): Set<string> {
    const systemOidsByCategory = useSelector(oidSelectors.systemOidsByCategory);
    const oidsByCategory = useSelector(oidSelectors.oidsByCategory);

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
