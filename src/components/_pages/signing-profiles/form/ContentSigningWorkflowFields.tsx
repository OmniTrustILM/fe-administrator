import { type ReactElement, useEffect, useMemo, useRef, useState } from 'react';
import { type FieldValues, useController, useFormContext, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import AttributeEditor from 'components/Attributes/AttributeEditor';
import HostnameListInput from 'components/Input/HostnameListInput';
import Switch from 'components/Switch';
import Widget from 'components/Widget';
import { isListedFor, actions as signingProfileActions, selectors as signingProfileSelectors } from 'ducks/signing-profiles';
import {
    type ContentSigningWorkflowDto,
    type ContentSigningWorkflowRequestDto,
    type RequestAttribute,
    SignatureLevel,
    SigningWorkflowType,
    TimestampSourceType,
} from 'types/openapi';
import {
    type AttributeDescriptorModel,
    type AttributeRequestModel,
    type AttributeResponseModel,
    type CustomAttributeModel,
    type DataAttributeModel,
    isCustomAttributeModel,
    isDataAttributeModel,
} from 'types/attributes';
import {
    asEditorAttributes,
    buildAttributeRequestModel,
    collectFormAttributes,
    resolveAttributeVersion,
} from 'utils/attributes/attributes';
import { validateOid, validateRequired } from 'utils/validators';
import { buildValidationRules } from 'utils/validators-helper';
import ContentSigningFormattingFields, { type ContentSigningFormattingDraft } from './ContentSigningFormattingFields';
import AllowedRequestAttributeSwitch from './AllowedRequestAttributeSwitch';
import {
    labelOf,
    permissionNamesOf,
    profileOnlyGroup,
    readableGroupTitle,
    requestGroupCodesOf,
    splitRequestGroupOf,
    ungroupedRequestAttributeNamesOf,
    ungroupedRequestGroup,
    withPanesByKind,
} from './requestAttributePermissions';
import TimestampSourceField from './TimestampSourceField';

/** Id of the formatting-attribute editor. It prefixes the form values the editor writes. */
const contentSigningAttributesEditorId = 'contentSigningProfileAttrs';

/** The formatting editor's values, leaving out a field that was visited but left empty, such as a file never chosen. */
export function collectContentSigningAttributes(
    descriptors: AttributeDescriptorModel[] | undefined,
    values: FieldValues,
): AttributeRequestModel[] {
    return collectFormAttributes(contentSigningAttributesEditorId, descriptors, values, undefined, { omitEmptyContent: true });
}

/** The formatting editor's values with numbers as typed, so a reloaded editor shows a rejected value and its error again. */
function draftContentSigningAttributes(descriptors: AttributeDescriptorModel[], values: FieldValues): AttributeRequestModel[] {
    return collectFormAttributes(contentSigningAttributesEditorId, descriptors, values, undefined, {
        omitEmptyContent: true,
        keepNumbersAsTyped: true,
    });
}

/**
 * An empty entry for each listed attribute the collected values leave out. A remounted editor keeps such a field empty, where a missing
 * entry takes the connector default.
 */
function clearedAttributes(descriptors: AttributeDescriptorModel[], collected: AttributeRequestModel[]): AttributeRequestModel[] {
    const collectedNames = new Set(collected.map((attribute) => attribute.name));
    return descriptors
        .filter(
            (descriptor): descriptor is DataAttributeModel | CustomAttributeModel =>
                (isDataAttributeModel(descriptor) || isCustomAttributeModel(descriptor)) && !collectedNames.has(descriptor.name),
        )
        .map((descriptor) => buildAttributeRequestModel(descriptor.name, [], descriptor, resolveAttributeVersion(descriptor)));
}

/** Form values the content-signing workflow tab owns; the connector shares `signatureFormattingConnectorUuid` with timestamping. */
export interface ContentSigningFormValues {
    signatureFormattingConnectorUuid: string;
    signatureFamilyCode: string;
    signatureLevel: SignatureLevel | '';
    requireNonRepudiation: boolean;
    requiredExtendedKeyUsageOids: string[];
    timestampSourceProfileUuid: string;
    /** Request-attribute groups and ungrouped request attributes a signing request may set. */
    allowedRequestAttributes: string[];
}

export const emptyContentSigningFormValues: Omit<ContentSigningFormValues, 'signatureFormattingConnectorUuid'> = {
    signatureFamilyCode: '',
    signatureLevel: '',
    requireNonRepudiation: false,
    requiredExtendedKeyUsageOids: [],
    timestampSourceProfileUuid: '',
    allowedRequestAttributes: [],
};

export function contentSigningFormValuesOf(workflow: ContentSigningWorkflowDto): ContentSigningFormValues {
    return {
        signatureFormattingConnectorUuid: workflow.signatureFormattingConnector?.uuid ?? '',
        signatureFamilyCode: workflow.family ?? '',
        signatureLevel: workflow.level ?? '',
        requireNonRepudiation: workflow.requireNonRepudiation ?? false,
        requiredExtendedKeyUsageOids: workflow.requiredExtendedKeyUsageOids ?? [],
        timestampSourceProfileUuid: workflow.timestampSource?.signingProfile.uuid ?? '',
        allowedRequestAttributes: workflow.allowedRequestAttributes ?? [],
    };
}

/** The saved workflow while the chosen connector is the saved one. Its attribute values and allowed names belong to that connector. */
function savedForConnector(connectorUuid: string, saved: ContentSigningWorkflowDto | undefined): ContentSigningWorkflowDto | undefined {
    return saved?.signatureFormattingConnector?.uuid === connectorUuid ? saved : undefined;
}

/** A level above SIGNED embeds a timestamp and so needs a timestamp source. */
export const embedsTimestamp = (level: SignatureLevel | ''): level is SignatureLevel => level !== '' && level !== SignatureLevel.Signed;

/** Core rejects an allowed name the level does not declare. The request keeps only the names the current listing declares. */
export function contentSigningWorkflowRequest(
    values: ContentSigningFormValues,
    formattingAttributeValues: RequestAttribute[],
    declaredPermissionNames: Set<string>,
): ContentSigningWorkflowRequestDto {
    const level = values.signatureLevel || undefined;
    return {
        type: SigningWorkflowType.ContentSigning,
        signatureFormattingConnectorUuid: values.signatureFormattingConnectorUuid,
        signatureFormattingConnectorAttributes: formattingAttributeValues,
        family: values.signatureFamilyCode,
        level,
        timestampSource: embedsTimestamp(values.signatureLevel)
            ? { signingProfileUuid: values.timestampSourceProfileUuid, type: TimestampSourceType.Internal }
            : undefined,
        requireNonRepudiation: values.requireNonRepudiation,
        requiredExtendedKeyUsageOids: values.requiredExtendedKeyUsageOids,
        allowedRequestAttributes: values.allowedRequestAttributes.filter((name) => declaredPermissionNames.has(name)),
    };
}

interface Props {
    /** Profile being edited. Core authorizes the declarations and attribute fetches against it. */
    signingProfileUuid?: string;
    /** Workflow the edited profile saved, whose attribute values and timestamp source the fields show. */
    savedWorkflow?: ContentSigningWorkflowDto;
}

const required = buildValidationRules([validateRequired()]);

const paneTitles: Record<string, string> = { [profileOnlyGroup]: 'Profile settings', [ungroupedRequestGroup]: 'Request attributes' };
const groupTitleOf = (group: string) => {
    const requestGroup = splitRequestGroupOf(group);
    if (requestGroup !== undefined) return `${readableGroupTitle(requestGroup)} (profile only)`;
    return paneTitles[group] ?? readableGroupTitle(group);
};

const profileOnlyNote = <span className="text-sm text-content-subtle">Request cannot set</span>;

/** Folding the pane hides the switches beside its attributes, so its summary names the ones they allow. */
const requestMaySetNote = (allowedLabels: string[]) =>
    allowedLabels.length > 0 ? `Requests may set: ${allowedLabels.join(', ')}` : 'Requests may set none';

export default function ContentSigningWorkflowFields({ signingProfileUuid, savedWorkflow }: Readonly<Props>): ReactElement {
    const dispatch = useDispatch();
    const formattingAttributeModels = useSelector(signingProfileSelectors.contentSigningProfileAndRequestAttributeModels);
    const isFetchingProfileAttributes = useSelector(signingProfileSelectors.isFetchingContentSigningProfileAttributes);
    const failedProfileAttributesFetch = useSelector(signingProfileSelectors.failedContentSigningProfileAttributesFetch);
    const requestAttributeDescriptors = useSelector(signingProfileSelectors.contentSigningRequestAttributeDescriptors);
    const requestGroupCodes = requestGroupCodesOf(requestAttributeDescriptors);
    const permissionNames = permissionNamesOf(requestAttributeDescriptors);
    const ungroupedRequestAttributeNames = ungroupedRequestAttributeNamesOf(requestAttributeDescriptors);
    const editorDescriptors = useMemo(
        () => withPanesByKind(formattingAttributeModels, requestAttributeDescriptors),
        [formattingAttributeModels, requestAttributeDescriptors],
    );
    const listedFor = useSelector(signingProfileSelectors.contentSigningAttributesListedFor);
    const { control, trigger, getValues, setValue } = useFormContext<ContentSigningFormValues>();
    const allowedNames = useWatch({ control, name: 'allowedRequestAttributes' });
    const allowedUngroupedLabels = requestAttributeDescriptors
        .filter((descriptor) => ungroupedRequestAttributeNames.has(descriptor.name) && allowedNames.includes(descriptor.name))
        .map(labelOf);
    // The editor unmounts while a listing is pending. These values hold the draft, so the editor shows it again when it reloads.
    const [draftAttributes, setDraftAttributes] = useState<{ connectorUuid: string; attributes: AttributeResponseModel[] }>();
    const { field: connector } = useController({ control, name: 'signatureFormattingConnectorUuid', rules: required });
    const { field: family } = useController({ control, name: 'signatureFamilyCode', rules: required });
    // The rule reads the picker's verdict through this ref. A Controller captures its rules at registration.
    const [selectionError, setSelectionError] = useState<string>();
    const selectionErrorRef = useRef(selectionError);
    selectionErrorRef.current = selectionError;
    const { field: level } = useController({
        control,
        name: 'signatureLevel',
        rules: buildValidationRules([validateRequired(), () => selectionErrorRef.current]),
    });
    const { field: nonRepudiation } = useController({ control, name: 'requireNonRepudiation' });
    const { field: ekuOids, fieldState: ekuOidsState } = useController({
        control,
        name: 'requiredExtendedKeyUsageOids',
        rules: buildValidationRules([validateOid()]),
    });

    useEffect(() => {
        dispatch(signingProfileActions.listSignatureFormattingConnectors({ workflowType: SigningWorkflowType.ContentSigning }));
    }, [dispatch]);

    useEffect(() => {
        if (!connector.value || !family.value || !level.value) return;
        dispatch(
            signingProfileActions.listContentSigningProfileAttributes({
                connectorUuid: connector.value,
                family: family.value,
                level: level.value,
                signingProfileUuid,
            }),
        );
    }, [dispatch, connector.value, family.value, level.value, signingProfileUuid]);

    // Clearing the connector keeps the draft. Choosing the same connector again resumes it.
    const chosenConnectorRef = useRef(connector.value);
    useEffect(() => {
        const previousConnector = chosenConnectorRef.current;
        if (!connector.value || previousConnector === connector.value) return;
        chosenConnectorRef.current = connector.value;
        const isFirstChosenConnector = !previousConnector;
        if (isFirstChosenConnector) return;
        setDraftAttributes(undefined);
        setValue('allowedRequestAttributes', savedForConnector(connector.value, savedWorkflow)?.allowedRequestAttributes ?? []);
    }, [connector.value, savedWorkflow, setValue]);

    // biome-ignore lint/correctness/useExhaustiveDependencies: the level is re-validated whenever the picker's verdict changes.
    useEffect(() => {
        void trigger('signatureLevel');
    }, [trigger, selectionError]);

    const draft: ContentSigningFormattingDraft = {
        connectorUuid: connector.value || undefined,
        familyCode: family.value || undefined,
        level: level.value || undefined,
    };
    const savedAttributes = savedForConnector(connector.value, savedWorkflow)?.signatureFormattingConnectorAttributes;
    const shownAttributes = draftAttributes?.connectorUuid === connector.value ? draftAttributes.attributes : savedAttributes;
    const keepEditorValues = () => {
        const shown = { connectorUuid: connector.value, family: family.value, level: level.value };
        if (!isListedFor(listedFor, shown)) return;
        const listedNames = new Set(formattingAttributeModels.map((model) => model.name));
        const collected = draftContentSigningAttributes(formattingAttributeModels, getValues());
        const edited = asEditorAttributes(
            [...collected, ...clearedAttributes(formattingAttributeModels, collected)],
            formattingAttributeModels,
        );
        const unlisted = (shownAttributes ?? []).filter((attribute) => !listedNames.has(attribute.name));
        setDraftAttributes({ connectorUuid: connector.value, attributes: [...edited, ...unlisted] });
    };
    const changeDraft = (next: ContentSigningFormattingDraft) => {
        keepEditorValues();
        connector.onChange(next.connectorUuid ?? '');
        family.onChange(next.familyCode ?? '');
        level.onChange(next.level ?? '');
    };

    return (
        <div className="space-y-4">
            <ContentSigningFormattingFields
                value={draft}
                onChange={changeDraft}
                onSelectionErrorChange={setSelectionError}
                signingProfileUuid={signingProfileUuid}
            />
            {embedsTimestamp(level.value) && (
                <TimestampSourceField
                    savedSource={savedWorkflow?.timestampSource?.signingProfile}
                    signingProfileUuid={signingProfileUuid}
                />
            )}
            {level.value && (
                <Widget title="Content Signing Formatting Connector Attributes" noBorder busy={isFetchingProfileAttributes}>
                    {failedProfileAttributesFetch && (
                        <p className="text-xs text-danger">
                            Failed to list the formatting connector attributes
                            {failedProfileAttributesFetch.reason ? `: ${failedProfileAttributesFetch.reason}` : ''}
                        </p>
                    )}
                    {formattingAttributeModels.length > 0 && (
                        <AttributeEditor
                            id={contentSigningAttributesEditorId}
                            attributeDescriptors={editorDescriptors}
                            attributes={shownAttributes}
                            groupTitle={groupTitleOf}
                            collapsibleGroups
                            groupSummaryNote={(group) =>
                                group === ungroupedRequestGroup ? requestMaySetNote(allowedUngroupedLabels) : undefined
                            }
                            groupControl={(group) => {
                                if (requestGroupCodes.has(group))
                                    return <AllowedRequestAttributeSwitch permissionName={group} label={readableGroupTitle(group)} />;
                                return group === profileOnlyGroup && profileOnlyNote;
                            }}
                            attributeControl={(descriptor) =>
                                ungroupedRequestAttributeNames.has(descriptor.name) && (
                                    <AllowedRequestAttributeSwitch permissionName={descriptor.name} label={descriptor.properties.label} />
                                )
                            }
                        />
                    )}
                    {requestAttributeDescriptors.length > 0 && (
                        <output className="block" data-testid="allowed-request-attributes-status">
                            {!allowedNames.some((name) => permissionNames.has(name)) && (
                                <p className="text-xs text-content-subtle">
                                    Signing requests under this profile can set no request attribute.
                                </p>
                            )}
                        </output>
                    )}
                    {!isFetchingProfileAttributes && !failedProfileAttributesFetch && formattingAttributeModels.length === 0 && (
                        <p className="text-xs text-content-subtle">The connector declares no attributes for this level.</p>
                    )}
                </Widget>
            )}
            <Switch
                id="requireNonRepudiation"
                checked={nonRepudiation.value}
                onChange={nonRepudiation.onChange}
                secondaryLabel="Require Non-Repudiation"
            />
            <div className="flex flex-col gap-1">
                <label htmlFor="requiredExtendedKeyUsageOidInput" className="block text-sm font-medium text-content-muted">
                    Required Extended Key Usages
                </label>
                <HostnameListInput
                    id="requiredExtendedKeyUsageOidInput"
                    values={ekuOids.value}
                    onValuesChange={ekuOids.onChange}
                    placeholder="Enter an OID and press Add"
                    validateValue={validateOid()}
                    invalid={!!ekuOidsState.error}
                />
                {ekuOidsState.error && <p className="text-xs text-danger mt-0.5">{ekuOidsState.error.message}</p>}
                {ekuOids.value.length === 0 && (
                    <p className="text-xs text-content-subtle">A certificate with any extended key usage qualifies.</p>
                )}
            </div>
        </div>
    );
}
