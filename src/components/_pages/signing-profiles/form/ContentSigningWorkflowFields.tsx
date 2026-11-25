import { type ReactElement, useEffect, useRef, useState } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import AttributeEditor from 'components/Attributes/AttributeEditor';
import HostnameListInput from 'components/Input/HostnameListInput';
import Switch from 'components/Switch';
import Widget from 'components/Widget';
import { actions as signingProfileActions, selectors as signingProfileSelectors } from 'ducks/signing-profiles';
import {
    type BaseAttributeDto,
    type ContentSigningWorkflowDto,
    type ContentSigningWorkflowRequestDto,
    type RequestAttribute,
    type ResponseAttribute,
    SignatureLevel,
    SigningWorkflowType,
    TimestampSourceType,
} from 'types/openapi';
import { validateOid, validateRequired } from 'utils/validators';
import { buildValidationRules } from 'utils/validators-helper';
import ContentSigningFormattingFields, { type ContentSigningFormattingDraft } from './ContentSigningFormattingFields';
import TimestampSourceField from './TimestampSourceField';

/** Id of the profile-attribute editor, which prefixes the form values `collectFormAttributes` reads. */
export const contentSigningAttributesEditorId = 'contentSigningProfileAttrs';

/** Form values the content-signing workflow tab owns; the connector shares `signatureFormattingConnectorUuid` with timestamping. */
export interface ContentSigningFormValues {
    signatureFormattingConnectorUuid: string;
    signatureFamilyCode: string;
    signatureLevel: SignatureLevel | '';
    requireNonRepudiation: boolean;
    requiredExtendedKeyUsageOids: string[];
    timestampSourceProfileUuid: string;
}

export const emptyContentSigningFormValues: Omit<ContentSigningFormValues, 'signatureFormattingConnectorUuid'> = {
    signatureFamilyCode: '',
    signatureLevel: '',
    requireNonRepudiation: false,
    requiredExtendedKeyUsageOids: [],
    timestampSourceProfileUuid: '',
};

export function contentSigningFormValuesOf(workflow: ContentSigningWorkflowDto): ContentSigningFormValues {
    return {
        signatureFormattingConnectorUuid: workflow.signatureFormattingConnector?.uuid ?? '',
        signatureFamilyCode: workflow.family ?? '',
        signatureLevel: workflow.level ?? '',
        requireNonRepudiation: workflow.requireNonRepudiation ?? false,
        requiredExtendedKeyUsageOids: workflow.requiredExtendedKeyUsageOids ?? [],
        timestampSourceProfileUuid: workflow.timestampSource?.signingProfile.uuid ?? '',
    };
}

/** The saved workflow while the chosen connector is the saved one. Its attribute values and allowed names belong to that connector. */
function savedForConnector(connectorUuid: string, saved: ContentSigningWorkflowDto | undefined): ContentSigningWorkflowDto | undefined {
    return saved?.signatureFormattingConnector?.uuid === connectorUuid ? saved : undefined;
}

/** The name a profile allows a request attribute by: its group, or its own name when it has none. */
function permissionName(descriptor: BaseAttributeDto): string {
    return ('properties' in descriptor && descriptor.properties?.group) || descriptor.name;
}

const asRequestAttribute = ({ uuid, name, contentType, content, version }: ResponseAttribute) =>
    ({ uuid, name, contentType, content, version }) as RequestAttribute;

/** A level above SIGNED embeds a timestamp and so needs a timestamp source. */
const embedsTimestamp = (level: SignatureLevel | ''): level is SignatureLevel => level !== '' && level !== SignatureLevel.Signed;

/**
 * The content-signing workflow of a profile request. Its request-attribute values and allowed names come from the saved workflow,
 * filtered by the declarations of the chosen level.
 */
export function contentSigningWorkflowRequest(
    values: ContentSigningFormValues,
    profileAttributeValues: RequestAttribute[],
    requestAttributeDescriptors: BaseAttributeDto[],
    savedWorkflow?: ContentSigningWorkflowDto,
): ContentSigningWorkflowRequestDto {
    const level = values.signatureLevel || undefined;
    const saved = savedForConnector(values.signatureFormattingConnectorUuid, savedWorkflow);
    const declaredNames = new Set(requestAttributeDescriptors.map((descriptor) => descriptor.name));
    const permissionNames = new Set(requestAttributeDescriptors.map(permissionName));
    const requestAttributeValues = (saved?.signatureFormattingConnectorAttributes ?? [])
        .filter((attribute) => declaredNames.has(attribute.name))
        .map(asRequestAttribute);
    return {
        type: SigningWorkflowType.ContentSigning,
        signatureFormattingConnectorUuid: values.signatureFormattingConnectorUuid,
        signatureFormattingConnectorAttributes: [...profileAttributeValues, ...requestAttributeValues],
        family: values.signatureFamilyCode,
        level,
        timestampSource: embedsTimestamp(values.signatureLevel)
            ? { signingProfileUuid: values.timestampSourceProfileUuid, type: TimestampSourceType.Internal }
            : undefined,
        requireNonRepudiation: values.requireNonRepudiation,
        requiredExtendedKeyUsageOids: values.requiredExtendedKeyUsageOids,
        allowedRequestAttributes: saved?.allowedRequestAttributes?.filter((name) => permissionNames.has(name)),
    };
}

interface Props {
    /** Profile being edited. Core authorizes the declarations and attribute fetches against it. */
    signingProfileUuid?: string;
    /** Workflow the edited profile saved, whose attribute values and timestamp source the fields show. */
    savedWorkflow?: ContentSigningWorkflowDto;
}

const required = buildValidationRules([validateRequired()]);

export default function ContentSigningWorkflowFields({ signingProfileUuid, savedWorkflow }: Readonly<Props>): ReactElement {
    const dispatch = useDispatch();
    const profileAttributeModels = useSelector(signingProfileSelectors.contentSigningProfileAttributeModels);
    const isFetchingProfileAttributes = useSelector(signingProfileSelectors.isFetchingContentSigningProfileAttributes);
    const failedProfileAttributesFetch = useSelector(signingProfileSelectors.failedContentSigningProfileAttributesFetch);
    const { control, trigger } = useFormContext<ContentSigningFormValues>();
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
        dispatch(signingProfileActions.listTimestampSourceCandidates());
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

    // biome-ignore lint/correctness/useExhaustiveDependencies: the level is re-validated whenever the picker's verdict changes.
    useEffect(() => {
        trigger('signatureLevel');
    }, [trigger, selectionError]);

    const draft: ContentSigningFormattingDraft = {
        connectorUuid: connector.value || undefined,
        familyCode: family.value || undefined,
        level: level.value || undefined,
    };
    const changeDraft = (next: ContentSigningFormattingDraft) => {
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
                            Failed to list the profile attributes
                            {failedProfileAttributesFetch.reason ? `: ${failedProfileAttributesFetch.reason}` : ''}
                        </p>
                    )}
                    {profileAttributeModels.length > 0 && (
                        <AttributeEditor
                            id={contentSigningAttributesEditorId}
                            attributeDescriptors={profileAttributeModels}
                            attributes={savedForConnector(connector.value, savedWorkflow)?.signatureFormattingConnectorAttributes}
                        />
                    )}
                    {!isFetchingProfileAttributes && !failedProfileAttributesFetch && profileAttributeModels.length === 0 && (
                        <p className="text-xs text-content-subtle">The connector declares no profile attributes for this level.</p>
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
