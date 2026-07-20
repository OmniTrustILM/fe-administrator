import RequestAttributeAuthoringEditor from 'components/RequestAttributes/RequestAttributeAuthoringEditor';
import Switch from 'components/Switch';
import Widget from 'components/Widget';
import { actions as oidActions, selectors as oidSelectors } from 'ducks/oids';
import { actions, selectors } from 'ducks/raProfileRequestAttributes';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { OidCategory } from 'types/openapi';
import { toOidSelectOptions } from 'utils/oid';
import {
    buildPlatformDefaultUpdateDto,
    emptyAuthoringForm,
    parsePlatformDefaultDto,
    type RequestAttributeAuthoringFormValues,
} from 'utils/requestAttributeAuthoring';

/**
 * Platform-wide default request-attribute set editor. Reads/writes the `/platform`
 * `CertificateSettings.requestAttributes` sub-section through the duck (no bespoke endpoint,
 * no merge mode).
 */
export default function RequestAttributesSettings() {
    const dispatch = useDispatch();

    const defaultSet = useSelector(selectors.defaultSet);
    const isFetching = useSelector(selectors.isFetchingDefaultSet);
    const isUpdating = useSelector(selectors.isUpdatingDefaultSet);
    const oidsByCategory = useSelector(oidSelectors.oidsByCategory);
    const oidsByCategoryError = useSelector(oidSelectors.oidsByCategoryError);
    const oidsByCategoryLoaded = useSelector(oidSelectors.oidsByCategoryLoaded);
    const systemOidsByCategory = useSelector(oidSelectors.systemOidsByCategory);
    const systemOidsError = useSelector(oidSelectors.systemOidsError);
    const systemOidsLoaded = useSelector(oidSelectors.systemOidsLoaded);

    const [form, setForm] = useState<RequestAttributeAuthoringFormValues>(emptyAuthoringForm());
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        dispatch(actions.getPlatformDefaultRequestAttributes());
    }, [dispatch]);

    useEffect(() => {
        dispatch(oidActions.listOidsByCategory({ category: OidCategory.RdnAttributeType }));
        dispatch(oidActions.listOidsByCategory({ category: OidCategory.CertificateExtension }));
        // Standard RDNs (CN, O, OU, …) live in the backend SystemOid enum, not in /v1/oids/list — the
        // cached system list is merged into the RDN dropdown below. (No system certificateExtension entries.)
        dispatch(oidActions.listSystemOids());
    }, [dispatch]);

    // RDN target merges built-in system RDNs with custom ones; the two lists are disjoint by construction
    // (the backend rejects a custom OID that shadows a system OID), so no dedupe is needed.
    const rdnOptions = useMemo(
        () =>
            toOidSelectOptions([
                ...(systemOidsByCategory[OidCategory.RdnAttributeType] ?? []),
                ...(oidsByCategory[OidCategory.RdnAttributeType] ?? []),
            ]),
        [systemOidsByCategory, oidsByCategory],
    );
    const extensionOptions = useMemo(() => toOidSelectOptions(oidsByCategory[OidCategory.CertificateExtension] ?? []), [oidsByCategory]);
    const rdnOptionsError = !!oidsByCategoryError[OidCategory.RdnAttributeType] || systemOidsError;
    const extensionOptionsError = !!oidsByCategoryError[OidCategory.CertificateExtension];
    const rdnOptionsLoaded = !!oidsByCategoryLoaded[OidCategory.RdnAttributeType] && systemOidsLoaded;
    const extensionOptionsLoaded = !!oidsByCategoryLoaded[OidCategory.CertificateExtension];

    // Seed the form once, on the undefined → defined transition of the fetched set. Re-seeding on
    // every `defaultSet` reference change would clobber in-progress edits when a late fetch resolves.
    useEffect(() => {
        if (defaultSet !== undefined && !loaded) {
            setForm({
                ...emptyAuthoringForm(),
                attributes: parsePlatformDefaultDto(defaultSet),
                externalCsrValidationStrict: defaultSet?.externalCsrValidationStrict,
            });
            setLoaded(true);
        }
    }, [defaultSet, loaded]);

    // Persist on every editor mutation (add / edit / remove) so the attribute dialog's own Save is the
    // only click a user needs — there is no separate form-level Save to confirm the change again.
    const onChange = useCallback(
        (next: RequestAttributeAuthoringFormValues) => {
            setForm(next);
            // Guard against saving before the fetch has seeded the form, which would PUT
            // requestAttributes: [] and wipe the platform default set (the epic's read-merge only
            // preserves the sibling externalCsrValidationStrict, not the array). The editor is disabled
            // while `isUpdating`, so mutations can't overlap an in-flight write.
            if (!loaded) return;
            dispatch(
                actions.updatePlatformDefaultRequestAttributes({
                    data: buildPlatformDefaultUpdateDto(next.attributes, next.externalCsrValidationStrict),
                }),
            );
        },
        [dispatch, loaded],
    );

    const editor = useMemo(
        // Platform default set: no merge mode and no value-source bindings (not in the platform DTO).
        () => (
            <RequestAttributeAuthoringEditor
                value={form}
                onChange={onChange}
                showBindings={false}
                disabled={isUpdating || !loaded}
                rdnOptions={rdnOptions}
                extensionOptions={extensionOptions}
                rdnOptionsError={rdnOptionsError}
                extensionOptionsError={extensionOptionsError}
                rdnOptionsLoaded={rdnOptionsLoaded}
                extensionOptionsLoaded={extensionOptionsLoaded}
            />
        ),
        [
            form,
            onChange,
            isUpdating,
            loaded,
            rdnOptions,
            extensionOptions,
            rdnOptionsError,
            extensionOptionsError,
            rdnOptionsLoaded,
            extensionOptionsLoaded,
        ],
    );

    return (
        <Widget title="Default Request Attributes" titleSize="large" busy={isFetching} enableBusyOverlay noBorder>
            <div className="space-y-4">
                <p className="text-sm text-gray-500">
                    The platform default request-attribute set is the terminal fallback used when an RA Profile does not define its own set.
                    Changes are saved automatically.
                </p>
                <Switch
                    id="externalCsrValidationStrict"
                    label="Strict external CSR validation"
                    checked={form.externalCsrValidationStrict ?? false}
                    onChange={(c) => onChange({ ...form, externalCsrValidationStrict: c })}
                    disabled={isUpdating || !loaded}
                />
                {editor}
            </div>
        </Widget>
    );
}
