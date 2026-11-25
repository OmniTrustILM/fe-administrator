import { type ReactElement, useEffect } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { TriangleAlert } from 'lucide-react';
import AttributeEditor from 'components/Attributes/AttributeEditor';
import HostnameListInput from 'components/Input/HostnameListInput';
import Select from 'components/Select';
import Switch from 'components/Switch';
import TextInput from 'components/TextInput';
import Widget from 'components/Widget';
import { actions as signingProfileActions, selectors as signingProfileSelectors } from 'ducks/signing-profiles';
import { actions as tqcActions, selectors as tqcSelectors } from 'ducks/time-quality-configurations';
import { DigestAlgorithm, SigningWorkflowType, type TimestampingWorkflowDto } from 'types/openapi';
import { getMillisecondsFromIso8601String } from 'utils/duration';
import { validateOid, validateRequired } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';
import { formattingConnectorListError } from './formattingConnectorListError';
import { digestAlgorithmOption, type SigningProfileFormValues, timestampingAttributesEditorId } from './signingProfileFormValues';

const connectorLabel = 'Timestamp Formatting Connector';

export const timestampingConnectorList = signingProfileSelectors.signatureFormattingConnectorListFor(SigningWorkflowType.Timestamping);

const digestAlgorithmOptions = Object.values(DigestAlgorithm).map(digestAlgorithmOption);

/** Accuracy above which a qualified timestamp may miss its requirements. */
const qualifiedAccuracyLimitMs = 1000;

interface Props {
    /** Profile being edited. Core authorizes the attribute fetch against it. */
    signingProfileUuid?: string;
    /** Workflow the edited profile saved, whose attribute values the connector's editor shows. */
    savedWorkflow?: TimestampingWorkflowDto;
}

/** Formatting connector, qualification, time quality and policy settings of a timestamping profile. */
export default function TimestampingWorkflowFields({ signingProfileUuid, savedWorkflow }: Readonly<Props>): ReactElement {
    const dispatch = useDispatch();
    const { control } = useFormContext<SigningProfileFormValues>();

    useEffect(() => {
        dispatch(signingProfileActions.listSignatureFormattingConnectors({ workflowType: SigningWorkflowType.Timestamping }));
    }, [dispatch]);

    return (
        <div className="space-y-4">
            <FormattingConnectorField signingProfileUuid={signingProfileUuid} savedWorkflow={savedWorkflow} />
            <div className="flex items-center mt-2">
                <Controller
                    name="qualifiedTimestamp"
                    control={control}
                    render={({ field }) => (
                        <Switch
                            id="qualifiedTimestamp"
                            checked={field.value}
                            onChange={field.onChange}
                            secondaryLabel="Qualified Timestamp (ETSI EN 319 421)"
                        />
                    )}
                />
            </div>
            <div className="flex items-center mt-2">
                <Controller
                    name="validateTokenSignature"
                    control={control}
                    render={({ field }) => (
                        <Switch
                            id="validateTokenSignature"
                            checked={field.value}
                            onChange={field.onChange}
                            secondaryLabel="Validate Timestamp after Creation"
                        />
                    )}
                />
            </div>
            <TimeQualityConfigurationField />
            <PolicyIdFields />
            <Controller
                name="allowedDigestAlgorithms"
                control={control}
                render={({ field }) => (
                    <Select
                        id="allowedDigestAlgorithms"
                        label="Allowed Digest Algorithms"
                        value={field.value}
                        onChange={(options) => field.onChange(options ?? [])}
                        options={digestAlgorithmOptions}
                        placeholder="All digest algorithms accepted (leave empty)"
                        isMulti
                        placement="bottom"
                    />
                )}
            />
        </div>
    );
}

function FormattingConnectorField({ signingProfileUuid, savedWorkflow }: Readonly<Props>): ReactElement {
    const dispatch = useDispatch();
    const { connectors, isFetching: isFetchingConnectors, failure: failedConnectorsFetch } = useSelector(timestampingConnectorList);
    const attributeDescriptors = useSelector(signingProfileSelectors.signatureFormattingConnectorAttributeModels);
    const isFetchingAttributes = useSelector(signingProfileSelectors.isFetchingSignatureFormattingConnectorAttributes);
    const { control } = useFormContext<SigningProfileFormValues>();
    const connectorUuid = useWatch({ control, name: 'signatureFormattingConnectorUuid' });

    useEffect(() => {
        if (!connectorUuid) return;
        dispatch(signingProfileActions.listSignatureFormattingConnectorAttributes({ connectorUuid, signingProfileUuid }));
    }, [dispatch, connectorUuid, signingProfileUuid]);

    const connectorOptions = connectors.map((connector) => ({ value: connector.uuid, label: connector.name }));

    return (
        <>
            <Controller
                name="signatureFormattingConnectorUuid"
                control={control}
                rules={buildValidationRules([validateRequired()])}
                render={({ field, fieldState }) => (
                    <Select
                        id="signatureFormattingConnector"
                        label={connectorLabel}
                        required
                        value={field.value}
                        onChange={field.onChange}
                        options={connectorOptions}
                        placeholder="Select a connector…"
                        isClearable
                        isDisabled={isFetchingConnectors}
                        placement="bottom"
                        error={formattingConnectorListError(connectorLabel, failedConnectorsFetch) ?? getFieldErrorMessage(fieldState)}
                    />
                )}
            />
            {connectorUuid && (
                <Widget title={`${connectorLabel} Attributes`} noBorder busy={isFetchingAttributes}>
                    {attributeDescriptors.length > 0 ? (
                        <AttributeEditor
                            id={timestampingAttributesEditorId}
                            attributeDescriptors={attributeDescriptors}
                            attributes={savedWorkflow?.signatureFormattingConnectorAttributes}
                        />
                    ) : (
                        !isFetchingAttributes && (
                            <p className="text-xs text-content-subtle">No attributes available for the selected connector.</p>
                        )
                    )}
                </Widget>
            )}
        </>
    );
}

function TimeQualityConfigurationField(): ReactElement {
    const dispatch = useDispatch();
    const timeQualityConfigurations = useSelector(tqcSelectors.timeQualityConfigurations);
    const isFetchingList = useSelector(tqcSelectors.isFetchingList);
    const selectedConfiguration = useSelector(tqcSelectors.timeQualityConfiguration);
    const { control, getValues, trigger } = useFormContext<SigningProfileFormValues>();
    const qualifiedTimestamp = useWatch({ control, name: 'qualifiedTimestamp' });
    const configurationUuid = useWatch({ control, name: 'timeQualityConfigurationUuid' });

    useEffect(() => {
        dispatch(tqcActions.listTimeQualityConfigurations({}));
    }, [dispatch]);

    // Only the detail carries the accuracy.
    useEffect(() => {
        if (configurationUuid) dispatch(tqcActions.getTimeQualityConfiguration({ uuid: configurationUuid }));
    }, [dispatch, configurationUuid]);

    // RHF leaves this field's verdict, and so isValid, stale when the toggle flips (issue #1820).
    // biome-ignore lint/correctness/useExhaustiveDependencies: the field is re-validated whenever the toggle flips.
    useEffect(() => {
        void trigger('timeQualityConfigurationUuid');
    }, [qualifiedTimestamp, trigger]);

    const options = timeQualityConfigurations.map((configuration) => ({ value: configuration.uuid, label: configuration.name }));
    const accuracy = selectedConfiguration?.uuid === configurationUuid ? selectedConfiguration?.accuracy : undefined;
    const accuracyMs = getMillisecondsFromIso8601String(accuracy);
    const accuracyTooCoarse = qualifiedTimestamp && accuracyMs !== undefined && accuracyMs > qualifiedAccuracyLimitMs;

    return (
        <>
            <Controller
                name="timeQualityConfigurationUuid"
                control={control}
                // The rule reads the toggle through getValues. A Controller captures its rules at registration.
                rules={buildValidationRules([(value) => (getValues('qualifiedTimestamp') ? validateRequired()(value) : undefined)])}
                render={({ field, fieldState }) => (
                    <Select
                        id="timeQualityConfigurationUuid"
                        required={qualifiedTimestamp}
                        label={qualifiedTimestamp ? 'Time Quality Configuration' : 'Time Quality Configuration (optional)'}
                        placeholder="Select a Time Quality Configuration…"
                        options={options}
                        value={options.find((option) => option.value === field.value) ?? null}
                        onChange={field.onChange}
                        isDisabled={isFetchingList}
                        isClearable
                        error={getFieldErrorMessage(fieldState)}
                    />
                )}
            />
            {accuracyTooCoarse && (
                <div className="mt-2 flex items-start gap-x-2 rounded-md border border-warning bg-warning-surface p-2 text-sm text-warning">
                    <TriangleAlert size={16} className="mt-0.5 shrink-0" />
                    <span>
                        The selected Time Quality Configuration has an accuracy coarser than 1&nbsp;second
                        {accuracy ? ` (${accuracy})` : ''} — this may not satisfy qualified timestamp requirements.
                    </span>
                </div>
            )}
        </>
    );
}

/** Default and allowed TSA policy IDs, validated as Core's @ValidOid and @ValidDefaultPolicyId do. */
function PolicyIdFields(): ReactElement {
    const { control, getValues } = useFormContext<SigningProfileFormValues>();

    const defaultAmongAllowed = (value: unknown) => {
        const allowed = getValues('allowedPolicyIds');
        if (!value || allowed.length === 0 || allowed.includes(String(value))) return undefined;
        return 'Default policy ID must be among the allowed policy IDs';
    };

    return (
        <>
            <Controller
                name="defaultPolicyId"
                control={control}
                rules={buildValidationRules([validateOid(), defaultAmongAllowed])}
                render={({ field, fieldState }) => (
                    <TextInput
                        {...field}
                        id="defaultPolicyId"
                        type="text"
                        label="Default TSA Policy ID (OID format)"
                        placeholder="e.g. 1.2.3.4.5"
                        // Shown untouched: an edit of the allowed list can break the rule, which would otherwise disable Update without a visible reason.
                        invalid={!!fieldState.error}
                        error={fieldState.error?.message}
                    />
                )}
            />
            <div className="flex flex-col gap-1">
                <label htmlFor="policyIdInput" className="block text-sm font-medium text-content-muted">
                    Allowed TSA Policy IDs
                </label>
                <Controller
                    name="allowedPolicyIds"
                    control={control}
                    rules={{ ...buildValidationRules([validateOid()]), deps: ['defaultPolicyId'] }}
                    render={({ field, fieldState }) => (
                        <>
                            <HostnameListInput
                                id="policyIdInput"
                                values={field.value}
                                onValuesChange={field.onChange}
                                placeholder="Enter an OID and press Add"
                                validateValue={validateOid()}
                                invalid={!!fieldState.error}
                            />
                            {fieldState.error && <p className="text-xs text-danger mt-0.5">{fieldState.error.message}</p>}
                            {field.value.length === 0 && (
                                <p className="text-xs text-content-subtle">No policies added. All policy IDs will be accepted.</p>
                            )}
                        </>
                    )}
                />
            </div>
        </>
    );
}
