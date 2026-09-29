import AttributeEditor from 'components/Attributes/AttributeEditor';
import Button from 'components/Button';
import Callout from 'components/Callout';
import Container from 'components/Container';
import InfoNote from 'components/InfoNote';
import FileUpload from 'components/Input/FileUpload/FileUpload';
import ProgressButton from 'components/ProgressButton';
import RetryCallout from 'components/RetryCallout';
import Widget from 'components/Widget';
import { selectors as authSelectors } from 'ducks/auth';
import { actions as certificatesActions, selectors as certificatesSelectors } from 'ducks/certificates';
import {
    actions as keysActions,
    type AttributeSchema,
    type ImportKeyAttributesRequest,
    selectors as keysSelectors,
} from 'ducks/cryptographic-keys';
import { actions as customAttributesActions, selectors as customAttributesSelectors } from 'ducks/customAttributes';
import { actions as inspectionsActions, selectors as inspectionsSelectors } from 'ducks/inspections';
import { actions as tokenProfilesActions, selectors as tokenProfilesSelectors } from 'ducks/token-profiles';
import { transformAttributeDescriptorDtoToModel, transformAttributeRequestModelToDto } from 'ducks/transform/attributes';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import type { AttributeDescriptorModel } from 'types/attributes';
import {
    Resource,
    ResourceAction,
    type CertificateImportResultDto,
    type InspectedEntryDto,
    type InspectionResponseDto,
    type KeyRequestType,
    type RequestAttribute,
    type TokenProfileDto,
} from 'types/openapi';
import { collectFormAttributes } from 'utils/attributes/attributes';
import { hasResourceAction } from 'utils/permissions';
import DetectedContent, { entryCount } from './DetectedContent';
import FilePassword, { type FilePasswordValues } from './FilePassword';
import ImportResults from './ImportResults';
import KeyDestination, { IMPORT_ATTRIBUTES_ID, type KeyDestinationValues } from './KeyDestination';
import WizardSection from './WizardSection';
import {
    buildImportRequest,
    hasCertificate,
    importableCodes,
    isSelectable,
    isSupported,
    keyRequestTypeOf,
    supportedKeys,
    type ImportDestination,
} from './importRequest';

const CUSTOM_ATTRIBUTES_ID = 'customImportCertificate';
const KEY_CUSTOM_ATTRIBUTES_ID = 'customImportKey';
const NO_ATTRIBUTES: AttributeDescriptorModel[] = [];
const PASSWORD_AGAIN = 'Enter the file password again to import.';

/** `inspectedPassphrase` is the password the shown entries were read with, so leaving the field reads the file again only on a change. */
type FormValues = KeyDestinationValues & FilePasswordValues & { inspectedPassphrase: string };

const DEFAULT_VALUES: FormValues = { passphrase: '', inspectedPassphrase: '', exportable: false, keyNames: {} };

/** What was sent, so a retry sends the failed entries of the same file to the same destination. */
type Submission = {
    file: string;
    entries: InspectedEntryDto[];
    destination?: ImportDestination;
    customAttributes?: RequestAttribute[];
};

type Props = Readonly<{
    presetTokenProfileUuid?: string;
    onCancel: () => void;
    onDone: (results: CertificateImportResultDto[]) => void;
}>;

const requestAttributes = (id: string, descriptors: AttributeDescriptorModel[], values: FormValues) =>
    collectFormAttributes(id, descriptors, values).map(transformAttributeRequestModelToDto);

/** A retry answers only the entries it sent again, so each earlier result is replaced by its newer one. */
const mergeResults = (previous: CertificateImportResultDto[] | undefined, latest: CertificateImportResultDto[]) =>
    previous?.map((result) => latest.find((each) => each.entryReference === result.entryReference) ?? result) ?? latest;

type LatestInspection = {
    file: string;
    inspection?: InspectionResponseDto;
    error?: string;
    status?: number;
    inspectedProfileUuid?: string;
};

/**
 * What the latest inspection shows. Core checks the profile before it reads the file, so only a 403 (a profile the user
 * may not use) or a 404 (one deleted since it was listed) refuses the profile: the entries read before stay, and the
 * refusal is said at the profile, which is dropped so that another can be chosen. Any other failure is the file's.
 */
const inspectionOutcome = ({ file, inspection, error, status, inspectedProfileUuid }: LatestInspection) => {
    const refusedProfileUuid = file && error && (status === 403 || status === 404) ? inspectedProfileUuid : undefined;
    const profileRefusal = refusedProfileUuid && inspection ? error : undefined;
    return { refusedProfileUuid, profileRefusal, inspected: !!file && !!inspection && (!error || !!profileRefusal) };
};

/**
 * A protected file asks for its password. An inspection does not say whether a file is protected, only that Core refused
 * to read it (422), as it refuses one without the right password; a file read with a password keeps the field, since its
 * import needs the password again.
 */
const asksForPassword = (readWithPassword: boolean, status: number | undefined) => readWithPassword || status === 422;

/** The listed import attribute schema, once it is listed for the chosen profile and the selected keys' type. */
const importSchemaFor = (
    listed: AttributeSchema<ImportKeyAttributesRequest> | undefined,
    profile: TokenProfileDto | undefined,
    keyType: KeyRequestType | undefined,
) => (profile && keyType && listed?.request.tokenProfileUuid === profile.uuid && listed.request.type === keyType ? listed : undefined);

export default function ImportWizard({ presetTokenProfileUuid, onCancel, onDone }: Props) {
    const dispatch = useDispatch();

    const inspection = useSelector(inspectionsSelectors.inspection);
    const inspectionError = useSelector(inspectionsSelectors.inspectionError);
    const inspectionErrorStatus = useSelector(inspectionsSelectors.inspectionErrorStatus);
    const isInspecting = useSelector(inspectionsSelectors.isInspecting);
    const profiles = useSelector(tokenProfilesSelectors.importableTokenProfiles);
    const profilesListingSucceeded = useSelector(tokenProfilesSelectors.isImportableTokenProfilesListed);
    const profilesListingError = useSelector(tokenProfilesSelectors.importableTokenProfilesError);
    const listedImportSchema = useSelector(keysSelectors.importKeyAttributes);
    const customAttributeDescriptors = useSelector(customAttributesSelectors.secondaryResourceCustomAttributes);
    const keyCustomAttributeDescriptors = useSelector(customAttributesSelectors.resourceCustomAttributes);
    const isListingCertificateCustomAttributes = useSelector(customAttributesSelectors.isFetchingResourceSecondaryCustomAttributes);
    const isListingKeyCustomAttributes = useSelector(customAttributesSelectors.isFetchingResourceCustomAttributes);
    const certificateCustomAttributesError = useSelector(customAttributesSelectors.secondaryResourceCustomAttributesError);
    const keyCustomAttributesError = useSelector(customAttributesSelectors.resourceCustomAttributesError);
    const importResults = useSelector(certificatesSelectors.importResults);
    const isImporting = useSelector(certificatesSelectors.isImporting);
    const auth = useSelector(authSelectors.profile);
    const mayImportKeys = hasResourceAction(auth, Resource.Keys, ResourceAction.ImportKey);

    const methods = useForm<FormValues>({ defaultValues: DEFAULT_VALUES, mode: 'onChange' });
    const { control, getValues, handleSubmit, setValue } = methods;
    const passphrase = useWatch({ control, name: 'passphrase' });

    const [file, setFile] = useState('');
    // The entries the user wants, kept apart from what the chosen profile accepts: an entry it refuses stays wanted.
    const [desired, setDesired] = useState<string[]>([]);
    const [profile, setProfile] = useState<TokenProfileDto>();
    // The token profile the latest inspection was read against, if any.
    const [inspectedProfileUuid, setInspectedProfileUuid] = useState<string>();
    // Whether the listed entries were read with a password. Clearing the field keeps it, since every import needs one.
    const [readWithPassword, setReadWithPassword] = useState(false);
    const [listedCodes, setListedCodes] = useState('');
    const [importGroupAttributes, setImportGroupAttributes] = useState(NO_ATTRIBUTES);
    const [pending, setPending] = useState(false);
    const [submission, setSubmission] = useState<Submission>();
    const [results, setResults] = useState<CertificateImportResultDto[]>();
    const inspectedDigest = useRef<string | undefined>(undefined);
    // The content last loaded, which `file` no longer holds once another file starts to be read.
    const loadedContent = useRef('');

    const { refusedProfileUuid, profileRefusal, inspected } = inspectionOutcome({
        file,
        inspection,
        error: inspectionError,
        status: inspectionErrorStatus,
        inspectedProfileUuid,
    });
    const entries = useMemo(() => (inspected && inspection ? inspection.entries : []), [inspected, inspection]);
    const selectedEntries = useMemo(
        () => entries.filter((entry) => isSelectable(entry, mayImportKeys) && desired.includes(entry.entryReference)),
        [entries, desired, mayImportKeys],
    );
    const selectedKeys = useMemo(() => selectedEntries.filter((entry) => keyRequestTypeOf(entry)), [selectedEntries]);
    // The keys wanted, with those the chosen profile refuses, so that another profile can be chosen for them.
    const desiredKeys = useMemo(
        () => supportedKeys(entries).filter((entry) => mayImportKeys && desired.includes(entry.entryReference)),
        [entries, desired, mayImportKeys],
    );
    const showDestination = desiredKeys.length > 0;
    const codes = importableCodes(desiredKeys).join(',');
    const profilesListed = !!codes && listedCodes === codes && profilesListingSucceeded;
    // Only the failure of the listing for the keys now wanted is said.
    const profilesError = listedCodes === codes ? profilesListingError : undefined;
    // Import attributes are listed for one key type, so key pairs and secret keys are imported apart: with both
    // selected, no schema is listed and nothing can be imported.
    const selectedKeyTypes = new Set(selectedKeys.map(keyRequestTypeOf));
    const mixedKeyTypes = selectedKeyTypes.size > 1;
    const keyType = selectedKeyTypes.size === 1 ? keyRequestTypeOf(selectedKeys[0]) : undefined;
    const importSchema = importSchemaFor(listedImportSchema, profile, keyType);
    // Exportable cannot be switched on later, so keys wait for the chosen profile's detail, which says whether it is offered.
    const profileDetail = useSelector(tokenProfilesSelectors.loadedTokenProfile(profile?.uuid));
    const profileDetailError = useSelector(tokenProfilesSelectors.detailError);
    const exportableKeyTypes = profileDetail?.keyTransfer?.exportableKeyTypes;
    const showExportable =
        !!exportableKeyTypes &&
        selectedKeys.length > 0 &&
        selectedKeys.every((entry) => !!entry.keyAlgorithm && !!exportableKeyTypes[keyRequestTypeOf(entry)!]?.includes(entry.keyAlgorithm));
    // The switch is for the chosen profile and the selected keys, so it is off again whenever either changes.
    const exportableFor = `${profile?.uuid}:${selectedKeys.map((entry) => entry.entryReference).join()}`;
    const exportableShownFor = useRef(exportableFor);
    const withCustomAttributes = selectedEntries.some(hasCertificate);
    const passwordMissing = readWithPassword && !passphrase;
    const importAttributeDescriptors = useMemo(
        () => (importSchema?.status === 'loaded' ? importSchema.descriptors.map(transformAttributeDescriptorDtoToModel) : NO_ATTRIBUTES),
        [importSchema],
    );

    const listCertificateCustomAttributes = useCallback(
        () => dispatch(customAttributesActions.listSecondaryResourceCustomAttributes(Resource.Certificates)),
        [dispatch],
    );

    const listKeyCustomAttributes = useCallback(
        () => dispatch(customAttributesActions.listResourceCustomAttributes(Resource.Keys)),
        [dispatch],
    );

    useEffect(() => {
        listCertificateCustomAttributes();
    }, [listCertificateCustomAttributes]);

    useEffect(() => {
        listKeyCustomAttributes();
    }, [listKeyCustomAttributes]);

    useEffect(
        () => () => {
            setValue('passphrase', '');
            setValue('inspectedPassphrase', '');
            dispatch(inspectionsActions.resetInspection());
        },
        [dispatch, setValue],
    );

    const inspect = useCallback(
        (content: string, tokenProfileUuid: string | undefined) => {
            const current = getValues('passphrase');
            setValue('inspectedPassphrase', current);
            setReadWithPassword(!!current);
            setInspectedProfileUuid(tokenProfileUuid);
            dispatch(
                inspectionsActions.inspectFile({
                    inspectionRequestDto: { file: content, passphrase: current || undefined, tokenProfileUuid },
                }),
            );
        },
        [dispatch, getValues, setValue],
    );

    // A new file, chosen or typed in, replaces the one read before, so that none of the old entries can be imported with it.
    const onContentChange = useCallback(() => {
        setFile('');
        dispatch(inspectionsActions.resetInspection());
    }, [dispatch]);

    const onFileContentLoaded = useCallback(
        (content: string) => {
            // A password is given for one file, so another file is read without it.
            if (content !== loadedContent.current) setValue('passphrase', '');
            loadedContent.current = content;
            setFile(content);
            inspect(content, profile?.uuid);
        },
        [inspect, profile, setValue],
    );

    const onPasswordLeave = useCallback(() => {
        const current = getValues('passphrase');
        const inspectedWith = getValues('inspectedPassphrase');
        if (!file || current === inspectedWith) return;
        // Entered again after an import cleared it, for entries already read with a password: nothing to read again.
        if (readWithPassword && !inspectedWith) {
            setValue('inspectedPassphrase', current);
            return;
        }
        inspect(file, profile?.uuid);
    }, [file, getValues, setValue, readWithPassword, inspect, profile]);

    const loadProfileDetail = useCallback(
        (chosen: TokenProfileDto) =>
            dispatch(
                tokenProfilesActions.getTokenProfileDetail({
                    tokenInstanceUuid: chosen.tokenInstanceUuid,
                    uuid: chosen.uuid,
                    skipWidgetLock: true,
                }),
            ),
        [dispatch],
    );

    const chooseProfile = useCallback(
        (next: TokenProfileDto | undefined) => {
            if (next?.uuid === profile?.uuid) return;
            setProfile(next);
            if (next) loadProfileDetail(next);
            if (file) inspect(file, next?.uuid);
        },
        [file, inspect, profile, loadProfileDetail],
    );

    const reloadProfileDetail = useCallback(() => {
        if (profile) loadProfileDetail(profile);
    }, [profile, loadProfileDetail]);

    // The same file keeps the entries wanted when it is read again with another password or profile.
    useEffect(() => {
        if (!inspection || inspection.containerDigest === inspectedDigest.current) return;
        inspectedDigest.current = inspection.containerDigest;
        setDesired(inspection.entries.filter(isSupported).map((entry) => entry.entryReference));
    }, [inspection]);

    useEffect(() => {
        if (!refusedProfileUuid || profile?.uuid !== refusedProfileUuid) return;
        setProfile(undefined);
        // A new file read first against the refused profile has no entries to keep, so it is read again without it.
        if (!inspection) inspect(file, undefined);
    }, [refusedProfileUuid, profile, inspection, file, inspect]);

    useEffect(() => {
        if (exportableShownFor.current === exportableFor) return;
        exportableShownFor.current = exportableFor;
        setValue('exportable', false);
    }, [exportableFor, setValue]);

    const listProfiles = useCallback(() => {
        if (!codes) return;
        dispatch(tokenProfilesActions.listImportableTokenProfiles({ importable: codes.split(',') }));
        setListedCodes(codes);
    }, [dispatch, codes]);

    useEffect(() => {
        listProfiles();
    }, [listProfiles]);

    useEffect(() => {
        if (!profilesListed) return;
        if (profile && !profiles.some((each) => each.uuid === profile.uuid)) {
            chooseProfile(undefined);
        } else if (!profile && presetTokenProfileUuid && presetTokenProfileUuid !== refusedProfileUuid) {
            const preset = profiles.find((each) => each.uuid === presetTokenProfileUuid);
            if (preset) chooseProfile(preset);
        }
    }, [profilesListed, profiles, profile, presetTokenProfileUuid, refusedProfileUuid, chooseProfile]);

    const listImportAttributes = useCallback(() => {
        if (!profile || !keyType) return;
        dispatch(
            keysActions.listImportKeyAttributeDescriptors({
                tokenInstanceUuid: profile.tokenInstanceUuid,
                tokenProfileUuid: profile.uuid,
                type: keyType,
            }),
        );
    }, [dispatch, profile, keyType]);

    useEffect(() => {
        setImportGroupAttributes(NO_ATTRIBUTES);
        listImportAttributes();
    }, [listImportAttributes]);

    // The password is dropped as soon as a request finishes, whatever its outcome; the next request asks for it again.
    useEffect(() => {
        if (!pending || isImporting) return;
        setPending(false);
        setValue('passphrase', '');
        setValue('inspectedPassphrase', '');
        if (importResults) setResults((previous) => mergeResults(previous, importResults));
    }, [pending, isImporting, importResults, setValue]);

    const send = useCallback(
        (sent: Submission, entriesToImport: InspectedEntryDto[], filePassphrase: string) => {
            setPending(true);
            dispatch(
                certificatesActions.importCertificates({
                    certificateImportRequestDto: buildImportRequest({
                        file: sent.file,
                        passphrase: filePassphrase,
                        selected: entriesToImport,
                        destination: sent.destination,
                        customAttributes: sent.customAttributes,
                    }),
                }),
            );
        },
        [dispatch],
    );

    const onSubmit = useCallback(
        (values: FormValues) => {
            const destination: ImportDestination | undefined =
                profile && selectedKeys.length
                    ? {
                          tokenProfileUuid: profile.uuid,
                          exportable: showExportable && values.exportable,
                          keyNames: values.keyNames,
                          importAttributes: requestAttributes(
                              IMPORT_ATTRIBUTES_ID,
                              [...importAttributeDescriptors, ...importGroupAttributes],
                              values,
                          ),
                          customAttributes: requestAttributes(KEY_CUSTOM_ATTRIBUTES_ID, keyCustomAttributeDescriptors, values),
                      }
                    : undefined;
            const sent: Submission = {
                file,
                entries: selectedEntries,
                destination,
                customAttributes: withCustomAttributes
                    ? requestAttributes(CUSTOM_ATTRIBUTES_ID, customAttributeDescriptors, values)
                    : undefined,
            };
            setSubmission(sent);
            send(sent, selectedEntries, values.passphrase);
        },
        [
            file,
            selectedEntries,
            selectedKeys,
            profile,
            showExportable,
            importAttributeDescriptors,
            importGroupAttributes,
            keyCustomAttributeDescriptors,
            withCustomAttributes,
            customAttributeDescriptors,
            send,
        ],
    );

    const onRetry = useCallback(() => {
        if (!submission || !results) return;
        const failed = submission.entries.filter((entry) =>
            results.some((result) => result.entryReference === entry.entryReference && !result.imported),
        );
        send(submission, failed, getValues('passphrase'));
    }, [submission, results, send, getValues]);

    const showResults = !!results && !!submission;
    const retryNeedsPassword = readWithPassword && !!results?.some((result) => !result.imported);

    // A failed listing leaves required custom attributes unasked, so the entries it applies to wait for it.
    const customAttributesFailed =
        (withCustomAttributes && !!certificateCustomAttributesError) || (selectedKeys.length > 0 && !!keyCustomAttributesError);

    const canImport =
        selectedEntries.length > 0 &&
        !isInspecting &&
        !isImporting &&
        !passwordMissing &&
        !isListingCertificateCustomAttributes &&
        !isListingKeyCustomAttributes &&
        !customAttributesFailed &&
        (selectedKeys.length === 0 || (importSchema?.status === 'loaded' && !!profileDetail));

    return (
        <Widget noBorder busy={isInspecting}>
            <FormProvider {...methods}>
                {results && submission && (
                    <ImportResults
                        entries={submission.entries}
                        results={results}
                        isImporting={isImporting}
                        retryDisabled={retryNeedsPassword && passwordMissing}
                        onRetry={onRetry}
                        onEdit={() => setResults(undefined)}
                        onDone={() => onDone(results)}
                    >
                        {retryNeedsPassword && <FilePassword notice={passwordMissing ? PASSWORD_AGAIN : undefined} />}
                    </ImportResults>
                )}

                {/* Hidden rather than unmounted under the results, so that going back to it finds every value as it was. */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" hidden={showResults}>
                    <FileUpload
                        id="importWizard"
                        editable
                        fileType="certificate or key"
                        onContentChange={onContentChange}
                        onFileContentLoaded={onFileContentLoaded}
                    />
                    {file && inspectionError && !profileRefusal && (
                        <Callout severity="danger" role="alert">
                            {inspectionError}
                        </Callout>
                    )}
                    {!showResults && asksForPassword(readWithPassword, inspectionErrorStatus) && (
                        <FilePassword onLeave={onPasswordLeave} notice={inspected && passwordMissing ? PASSWORD_AGAIN : undefined} />
                    )}

                    {inspected && (
                        <DetectedContent
                            entries={entries}
                            selected={selectedEntries.map((entry) => entry.entryReference)}
                            mayImportKeys={mayImportKeys}
                            onToggle={(entry, checked) =>
                                setDesired((current) =>
                                    checked ? [...current, entry.entryReference] : current.filter((each) => each !== entry.entryReference),
                                )
                            }
                        />
                    )}

                    {showDestination && (
                        <KeyDestination
                            keys={selectedKeys}
                            profiles={profiles}
                            profilesListed={profilesListed}
                            profilesError={profilesError}
                            onRetryProfiles={listProfiles}
                            profile={profile}
                            profileError={profileRefusal}
                            onProfileChange={chooseProfile}
                            importAttributeDescriptors={importAttributeDescriptors}
                            importAttributesError={importSchema?.status === 'failed' ? importSchema.error : undefined}
                            onRetryImportAttributes={listImportAttributes}
                            profileDetailError={selectedKeys.length > 0 && profile ? profileDetailError : undefined}
                            onRetryProfileDetail={reloadProfileDetail}
                            showExportable={showExportable}
                            mixedKeyTypes={mixedKeyTypes}
                            groupAttributesCallbackAttributes={importGroupAttributes}
                            setGroupAttributesCallbackAttributes={setImportGroupAttributes}
                        />
                    )}

                    {selectedKeys.length > 0 && (keyCustomAttributesError || keyCustomAttributeDescriptors.length > 0) && (
                        <WizardSection id="importKeyCustomAttributes" title="Key custom attributes">
                            {keyCustomAttributesError ? (
                                <RetryCallout message={keyCustomAttributesError} onRetry={listKeyCustomAttributes} />
                            ) : (
                                <AttributeEditor id={KEY_CUSTOM_ATTRIBUTES_ID} attributeDescriptors={keyCustomAttributeDescriptors} />
                            )}
                        </WizardSection>
                    )}

                    {withCustomAttributes && (certificateCustomAttributesError || customAttributeDescriptors.length > 0) && (
                        <WizardSection id="importCertificateAttributes" title="Certificate custom attributes">
                            {certificateCustomAttributesError ? (
                                <RetryCallout message={certificateCustomAttributesError} onRetry={listCertificateCustomAttributes} />
                            ) : (
                                <AttributeEditor id={CUSTOM_ATTRIBUTES_ID} attributeDescriptors={customAttributeDescriptors} />
                            )}
                        </WizardSection>
                    )}

                    <InfoNote>
                        Private keys are transferred protected and stored only in the provider – never in the platform. Selected
                        certificates are registered in inventory and the leaf is associated with its key.
                    </InfoNote>

                    <Container className="flex-row justify-end modal-footer" gap={4}>
                        <Button variant="outline" onClick={onCancel} disabled={isImporting} type="button">
                            Cancel
                        </Button>
                        <ProgressButton
                            title={`Import ${entryCount(selectedEntries.length)}`}
                            inProgressTitle="Importing..."
                            inProgress={isImporting}
                            disabled={!canImport}
                        />
                    </Container>
                </form>
            </FormProvider>
        </Widget>
    );
}
