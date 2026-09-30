import { actions as oidActions, selectors as oidSelectors } from 'ducks/oids';
import { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ExtensionValueEncoding, OidCategory } from 'types/openapi';
import { isCertificateExtensionProperties } from 'utils/oid';

export interface ExtensionOidRegistry {
    /** Whether the system or the custom extension list could not be loaded; the fields then check nothing. */
    failed: boolean;
    /** Loads both lists again. */
    reload: () => void;
}

/**
 * Fetches the certificate-extension OID registry (system + custom) and the detail of every custom
 * extension in `mappedOids`: the custom list carries no encoding or module, only the detail does.
 * Call once per form, e.g. from the attribute editor, not per field: every rendered field
 * dispatching its own fetch would fire a burst of parallel requests the epics then have to cancel.
 * Says when a list could not be loaded, with a reload for the editor's Retry.
 */
export function useFetchExtensionOidRegistry(mappedOids: readonly string[]): ExtensionOidRegistry {
    const dispatch = useDispatch();
    const customOids = useSelector(oidSelectors.oidsByCategory)[OidCategory.CertificateExtension];
    const customListError = useSelector(oidSelectors.oidsByCategoryError)[OidCategory.CertificateExtension];
    const systemOidsError = useSelector(oidSelectors.systemOidsError);
    const requested = useSelector(oidSelectors.extensionOidDetailsRequested);
    const enabled = mappedOids.length > 0;

    // Both fetches are cheap on remount: the system list is cached by the epic, and repeated
    // dispatches of the same custom category collapse via switchMap.
    const reload = useCallback(() => {
        dispatch(oidActions.listSystemOids());
        dispatch(oidActions.listOidsByCategory({ category: OidCategory.CertificateExtension }));
    }, [dispatch]);

    useEffect(() => {
        if (enabled) reload();
    }, [enabled, reload]);

    // Each detail is asked for once per list read: a detail arriving for one OID must not restart
    // the requests still running for the others.
    useEffect(() => {
        const mapped = new Set(mappedOids);
        for (const entry of customOids ?? []) {
            if (mapped.has(entry.oid) && !requested[entry.oid]) {
                dispatch(oidActions.getExtensionOidDetail({ oid: entry.oid }));
            }
        }
    }, [dispatch, mappedOids, customOids, requested]);

    return { failed: enabled && (systemOidsError || !!customListError), reload };
}

export interface DerExtensionOids {
    /** Every registered extension whose value encoding is DER; each takes its value as base64 DER. */
    all: Set<string>;
    /** Those an ASN.1 module describes, registered or shipped with Core; only these also take a JER value. */
    withModule: Set<string>;
    /** Custom extensions whose registry entry could not be read, with the reason; their encoding is unknown. */
    failed: Record<string, string>;
    /** Every extension the registry describes, whatever its encoding; a mapped OID outside it is unresolved. */
    known: Set<string>;
}

/**
 * The registered certificate extensions whose value encoding is DER: the system list plus the details
 * read for custom entries, two disjoint sets since Core refuses a custom OID that shadows a system
 * one. Only a DER extension takes a JER value, and only when a module describes it: for the string
 * encodings a value starting with `{` is literal text, so offering JSON validation there would reject
 * valid values.
 *
 * Empty while a registry list could not be loaded: what is held may predate an edit, and the editor
 * already says the values are not checked, so the fields must not check them from stale entries.
 *
 * Selection only; the fetches are `useFetchExtensionOidRegistry`.
 */
export function useDerExtensionOids(): DerExtensionOids {
    const systemOidsByCategory = useSelector(oidSelectors.systemOidsByCategory);
    const systemOidsError = useSelector(oidSelectors.systemOidsError);
    const customListError = useSelector(oidSelectors.oidsByCategoryError)[OidCategory.CertificateExtension];
    const extensionOidDetails = useSelector(oidSelectors.extensionOidDetails);
    const failed = useSelector(oidSelectors.extensionOidDetailsFailed);

    return useMemo(() => {
        const known = new Set<string>();
        const all = new Set<string>();
        const withModule = new Set<string>();
        if (systemOidsError || customListError) return { known, all, withModule, failed: {} };

        const entries = [...(systemOidsByCategory[OidCategory.CertificateExtension] ?? []), ...Object.values(extensionOidDetails)];
        for (const entry of entries) {
            known.add(entry.oid);
            const props = entry.additionalProperties;
            if (isCertificateExtensionProperties(props) && props.valueEncoding === ExtensionValueEncoding.Der) {
                all.add(entry.oid);
                if (props.valueSchema) withModule.add(entry.oid);
            }
        }
        return { known, all, withModule, failed };
    }, [systemOidsByCategory, systemOidsError, customListError, extensionOidDetails, failed]);
}
