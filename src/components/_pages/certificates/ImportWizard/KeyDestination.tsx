import AttributeEditor from 'components/Attributes/AttributeEditor';
import Callout from 'components/Callout';
import RetryCallout from 'components/RetryCallout';
import Select from 'components/Select';
import Switch from 'components/Switch';
import TextInput from 'components/TextInput';
import { type Dispatch, type ReactNode, type SetStateAction, useMemo } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import type { AttributeDescriptorModel } from 'types/attributes';
import { Resource, type InspectedEntryDto, type TokenProfileDto } from 'types/openapi';
import { validateRequired } from 'utils/validators';
import { buildValidationRules } from 'utils/validators-helper';
import { defaultKeyName, entryTitle } from './importRequest';
import WizardSection from './WizardSection';

export const IMPORT_ATTRIBUTES_ID = 'importKey';

export type KeyDestinationValues = {
    exportable: boolean;
    keyNames: Record<string, string>;
};

type Props = Readonly<{
    /** The selected keys, each named here. There may be none while a chosen profile keeps the destination shown. */
    keys: InspectedEntryDto[];
    profiles: TokenProfileDto[];
    /** Whether `profiles` is a listing that succeeded for the keys, so an empty one means no profile imports them. */
    profilesListed: boolean;
    /** Why the profiles could not be listed for the keys, which `onRetryProfiles` lists again. */
    profilesError?: string;
    onRetryProfiles: () => void;
    profile?: TokenProfileDto;
    /** Core's refusal to read the file against the profile last chosen, which was dropped for it. */
    profileError?: string;
    onProfileChange: (profile: TokenProfileDto | undefined) => void;
    /** The chosen profile's import attributes for the first selected key's type. */
    importAttributeDescriptors: AttributeDescriptorModel[];
    /** Why those import attributes could not be listed, which `onRetryImportAttributes` lists again. */
    importAttributesError?: string;
    onRetryImportAttributes: () => void;
    /** Whether the chosen profile's provider exports every selected key, which is when a key can be imported exportable. */
    showExportable: boolean;
    /** Whether the selected keys are both key pairs and secret keys, which are imported separately. */
    mixedKeyTypes: boolean;
    groupAttributesCallbackAttributes: AttributeDescriptorModel[];
    setGroupAttributesCallbackAttributes: Dispatch<SetStateAction<AttributeDescriptorModel[]>>;
}>;

export default function KeyDestination({
    keys,
    profiles,
    profilesListed,
    profilesError,
    onRetryProfiles,
    profile,
    profileError,
    onProfileChange,
    importAttributeDescriptors,
    importAttributesError,
    onRetryImportAttributes,
    showExportable,
    mixedKeyTypes,
    groupAttributesCallbackAttributes,
    setGroupAttributesCallbackAttributes,
}: Props) {
    const { control } = useFormContext<KeyDestinationValues>();

    // The chosen profile stays an option while a new listing is loading or has failed, so the choice keeps its label.
    const options = useMemo(() => {
        const listed = profile && !profiles.some((each) => each.uuid === profile.uuid) ? [...profiles, profile] : profiles;
        return listed.map((each) => ({ value: each.uuid, label: `${each.tokenInstanceName} / ${each.name}` }));
    }, [profiles, profile]);

    let profileNote: ReactNode;
    if (profileError) {
        profileNote = (
            <Callout severity="danger" role="alert" className="mt-2">
                {profileError}
            </Callout>
        );
    } else if (profilesError) {
        profileNote = (
            <div className="mt-2">
                <RetryCallout message={profilesError} onRetry={onRetryProfiles} />
            </div>
        );
    } else if (profilesListed && profiles.length === 0) {
        profileNote = (
            <Callout severity="warning" className="mt-2">
                No token profile imports the selected keys.
            </Callout>
        );
    } else {
        profileNote = (
            <p className="mt-2 text-sm text-content-muted">Only token profiles whose provider imports the selected keys are listed.</p>
        );
    }

    return (
        <>
            <WizardSection id="importKeyDestination" title="Key destination">
                {mixedKeyTypes && <Callout severity="warning">Import key pairs and secret keys separately.</Callout>}
                <div>
                    <Select
                        id="importTokenProfile"
                        label="Token profile"
                        value={profile?.uuid ?? ''}
                        options={options}
                        placeholder="Select token profile"
                        placement="bottom"
                        onChange={(value) =>
                            onProfileChange(value === profile?.uuid ? profile : profiles.find((each) => each.uuid === value))
                        }
                    />
                    {profileNote}
                </div>

                {keys.length > 0 && (
                    <fieldset className="space-y-3">
                        <legend className="mb-2 text-sm font-medium text-content">Key name</legend>
                        {keys.map((entry) => (
                            <Controller
                                key={entry.entryReference}
                                name={`keyNames.${entry.entryReference}`}
                                control={control}
                                defaultValue={defaultKeyName(entry)}
                                // Core names a key from its alias or its certificate's common name, so only a key with neither needs one.
                                rules={defaultKeyName(entry) ? undefined : buildValidationRules([validateRequired()])}
                                render={({ field, fieldState }) => (
                                    <div>
                                        <TextInput
                                            id={`importKeyName-${entry.entryReference}`}
                                            label={entryTitle(entry)}
                                            value={field.value}
                                            onChange={field.onChange}
                                            onBlur={field.onBlur}
                                            invalid={!!fieldState.error}
                                            error={fieldState.error?.message}
                                        />
                                    </div>
                                )}
                            />
                        ))}
                    </fieldset>
                )}

                {showExportable && (
                    <Controller
                        name="exportable"
                        control={control}
                        render={({ field }) => (
                            <div>
                                <Switch
                                    id="importExportable"
                                    checked={field.value}
                                    onChange={field.onChange}
                                    secondaryLabel="Exportable"
                                    ariaDescribedBy="importExportable-hint"
                                />
                                <p id="importExportable-hint" className="ml-16 text-sm text-content-muted">
                                    Can be exported later by users holding the key export permission. Off by default, and cannot be switched
                                    on later.
                                </p>
                            </div>
                        )}
                    />
                )}
            </WizardSection>

            {profile && keys.length > 0 && (importAttributesError || importAttributeDescriptors.length > 0) && (
                <WizardSection id="importKeyAttributes" title={`Import attributes – ${profile.tokenInstanceName}`}>
                    {importAttributesError ? (
                        <RetryCallout message={importAttributesError} onRetry={onRetryImportAttributes} />
                    ) : (
                        <AttributeEditor
                            id={IMPORT_ATTRIBUTES_ID}
                            attributeDescriptors={importAttributeDescriptors}
                            callbackParentUuid={profile.uuid}
                            callbackResource={Resource.Keys}
                            groupAttributesCallbackAttributes={groupAttributesCallbackAttributes}
                            setGroupAttributesCallbackAttributes={setGroupAttributesCallbackAttributes}
                        />
                    )}
                </WizardSection>
            )}
        </>
    );
}
