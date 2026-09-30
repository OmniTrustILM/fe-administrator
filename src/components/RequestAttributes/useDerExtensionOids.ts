import { actions as oidActions, selectors as oidSelectors } from 'ducks/oids';
import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ExtensionValueEncoding, OidCategory } from 'types/openapi';
import type { OIDResponseModel } from 'types/oids';
import { isCertificateExtensionProperties } from 'utils/oid';

/**
 * Fetches the certificate-extension OID registry (system + custom) and the detail of every custom
 * extension in `mappedOids`: the custom list carries no encoding or module, only the detail does.
 * Call once per form, e.g. from the attribute editor, not per field: every rendered field
 * dispatching its own fetch would fire a burst of parallel requests the epics then have to cancel.
 */
export function useFetchExtensionOidRegistry(mappedOids: readonly string[]): void {
    const dispatch = useDispatch();
    const customOids = useSelector(oidSelectors.oidsByCategory)[OidCategory.CertificateExtension];
    const extensionOidDetails = useSelector(oidSelectors.extensionOidDetails);
    const enabled = mappedOids.length > 0;

    useEffect(() => {
        if (!enabled) return;
        // Both fetches are cheap on remount: the system list is cached by the epic, and repeated
        // dispatches of the same custom category collapse via switchMap.
        dispatch(oidActions.listSystemOids());
        dispatch(oidActions.listOidsByCategory({ category: OidCategory.CertificateExtension }));
    }, [dispatch, enabled]);

    useEffect(() => {
        const mapped = new Set(mappedOids);
        for (const entry of customOids ?? []) {
            if (mapped.has(entry.oid) && !extensionOidDetails[entry.oid]) {
                dispatch(oidActions.getExtensionOidDetail({ oid: entry.oid }));
            }
        }
    }, [dispatch, mappedOids, customOids, extensionOidDetails]);
}

export interface DerExtensionOids {
    /** Every registered extension whose value encoding is DER; each takes its value as base64 DER. */
    all: Set<string>;
    /** Those an ASN.1 module describes, registered or shipped with Core; only these also take a JER value. */
    withModule: Set<string>;
}

/**
 * The registered certificate extensions whose value encoding is DER: the system list, overridden by
 * the detail of a custom entry for the same OID, as Core resolves it. Only a DER extension takes a
 * JER value, and only when a module describes it: for the string encodings a value starting with
 * `{` is literal text, so offering JSON validation there would reject valid values.
 *
 * Selection only; the fetches are `useFetchExtensionOidRegistry`.
 */
export function useDerExtensionOids(): DerExtensionOids {
    const systemOidsByCategory = useSelector(oidSelectors.systemOidsByCategory);
    const extensionOidDetails = useSelector(oidSelectors.extensionOidDetails);

    return useMemo(() => {
        const entries = new Map<string, OIDResponseModel>();
        for (const entry of systemOidsByCategory[OidCategory.CertificateExtension] ?? []) entries.set(entry.oid, entry);
        for (const entry of Object.values(extensionOidDetails)) entries.set(entry.oid, entry);

        const all = new Set<string>();
        const withModule = new Set<string>();
        for (const entry of entries.values()) {
            const props = entry.additionalProperties;
            if (isCertificateExtensionProperties(props) && props.valueEncoding === ExtensionValueEncoding.Der) {
                all.add(entry.oid);
                if (props.valueSchema) withModule.add(entry.oid);
            }
        }
        return { all, withModule };
    }, [systemOidsByCategory, extensionOidDetails]);
}
