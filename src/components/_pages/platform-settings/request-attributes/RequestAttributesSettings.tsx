import ExternalCsrValidationRadio from 'components/RequestAttributes/ExternalCsrValidationRadio';
import Label from 'components/Label';
import RequestAttributeAuthoringEditor from 'components/RequestAttributes/RequestAttributeAuthoringEditor';
import { useOidMappingOptions } from 'components/RequestAttributes/useOidMappingOptions';
import Widget from 'components/Widget';
import { actions, selectors } from 'ducks/raProfileRequestAttributes';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRunOnFailedFinish } from 'utils/common-hooks';
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
    const updateSucceeded = useSelector(selectors.updateDefaultSetSucceeded);
    const updateError = useSelector(selectors.updateDefaultSetError);
    const { rdnOptions, extensionOptions, rdnOptionsError, extensionOptionsError, rdnOptionsLoaded, extensionOptionsLoaded } =
        useOidMappingOptions();

    const [form, setForm] = useState<RequestAttributeAuthoringFormValues>(emptyAuthoringForm());
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        dispatch(actions.getPlatformDefaultRequestAttributes());
    }, [dispatch]);

    const formFromDefaultSet = useCallback(
        (): RequestAttributeAuthoringFormValues => ({
            ...emptyAuthoringForm(),
            attributes: parsePlatformDefaultDto(defaultSet),
            externalCsrValidationStrict: defaultSet?.externalCsrValidationStrict,
        }),
        [defaultSet],
    );

    // Seed the form once, on the undefined → defined transition of the fetched set. Re-seeding on
    // every `defaultSet` reference change would clobber in-progress edits when a late fetch resolves.
    useEffect(() => {
        if (defaultSet !== undefined && !loaded) {
            setForm(formFromDefaultSet());
            setLoaded(true);
        }
    }, [defaultSet, loaded, formFromDefaultSet]);

    // A rejected save persisted nothing, so drop the optimistic edit: `defaultSet` is only replaced on
    // success, which makes it the authoritative rollback target.
    const revertToPersisted = useCallback(() => setForm(formFromDefaultSet()), [formFromDefaultSet]);
    useRunOnFailedFinish(isUpdating, updateSucceeded, revertToPersisted);

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
                {updateError && (
                    <div
                        className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-800/10 dark:text-red-500"
                        data-testid="request-attributes-update-error"
                        role="alert"
                    >
                        {`The change was rejected and has not been saved: ${updateError}`}
                    </div>
                )}
                <div className="space-y-2">
                    <Label className="!text-base">Request validation</Label>
                    <ExternalCsrValidationRadio
                        strict={form.externalCsrValidationStrict ?? false}
                        onChange={(c) => onChange({ ...form, externalCsrValidationStrict: c })}
                        disabled={isUpdating || !loaded}
                    />
                </div>
                {editor}
            </div>
        </Widget>
    );
}
