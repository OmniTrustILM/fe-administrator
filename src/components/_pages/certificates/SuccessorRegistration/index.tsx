import AttributeEditor from 'components/Attributes/AttributeEditor';
import AttributeViewer from 'components/Attributes/AttributeViewer';
import Button from 'components/Button';
import Container from 'components/Container';
import CustomTable, { type TableDataRow } from 'components/CustomTable';
import TextInput from 'components/TextInput';
import Widget from 'components/Widget';
import { Controller, useFormContext } from 'react-hook-form';
import { Resource } from 'types/openapi';
import { validateRegistrationChallenge } from 'utils/validators';
import { buildValidationRules } from 'utils/validators-helper';
import { createWidgetDetailHeaders } from 'utils/widget';
import type { SuccessorFormValues, SuccessorRegistration } from './useSuccessorRegistration';

const detailHeaders = createWidgetDetailHeaders();

type Props = {
    successor: SuccessorRegistration;
};

export default function SuccessorRegistrationFields({ successor }: Readonly<Props>) {
    const { control } = useFormContext<SuccessorFormValues>();
    const { identity, sourceHasChallenge, hasChallenge } = successor;

    const flatIdentityRows: TableDataRow[] =
        identity.kind === 'flat'
            ? [
                  { id: 'subjectDn', columns: ['Subject DN', identity.subjectDn ?? ''] },
                  { id: 'subjectAltName', columns: ['Subject Alternative Names', identity.subjectAltName ?? ''] },
              ]
            : [];

    return (
        <>
            <Widget title="Identity" titleSize="large" noBorder>
                <div data-testid="successorIdentity">
                    {identity.kind === 'csrAttributes' ? (
                        <AttributeViewer attributes={identity.attributes} />
                    ) : (
                        <CustomTable headers={detailHeaders} data={flatIdentityRows} />
                    )}
                </div>
                {identity.kind === 'flat' && !successor.identityReplayable && (
                    <p className="mt-2 text-sm text-danger" data-testid="successorIdentityNotReplayable">
                        This identity cannot be registered as it is: {identity.omittedSanTypes.join(', ')} cannot be carried over, so the
                        successor would not match this certificate.
                    </p>
                )}
                {!successor.identityPresent && (
                    <p className="mt-2 text-sm text-danger">This certificate has no subject or SAN to register.</p>
                )}
            </Widget>

            <Controller
                control={control}
                name="successorAuthorizationSecret"
                rules={buildValidationRules([validateRegistrationChallenge()])}
                render={({ field: { value, onChange, onBlur }, fieldState }) => (
                    <TextInput
                        id="successorAuthorizationSecret"
                        type="password"
                        required={sourceHasChallenge}
                        label={sourceHasChallenge ? 'Challenge' : 'Challenge (optional)'}
                        labelTooltip={
                            sourceHasChallenge
                                ? 'This certificate is challenge-protected, so its successor needs its own challenge'
                                : 'Leave empty to register without a challenge — completion will not require a secret'
                        }
                        value={value ?? ''}
                        onChange={onChange}
                        onBlur={onBlur}
                        invalid={!!fieldState.error}
                        error={fieldState.error?.message}
                    />
                )}
            />

            <Controller
                control={control}
                name="successorExpiresAt"
                disabled={!hasChallenge}
                rules={{
                    validate: (value) => !value || new Date(value) > new Date() || 'Issuance window must be a future date',
                }}
                render={({ field: { value, onChange, onBlur }, fieldState }) => (
                    <TextInput
                        id="successorExpiresAt"
                        type="date"
                        label="Issuance window (optional)"
                        labelTooltip={hasChallenge ? undefined : 'Requires a challenge'}
                        disabled={!hasChallenge}
                        value={value ?? ''}
                        onChange={onChange}
                        onBlur={onBlur}
                        invalid={!!fieldState.error}
                        error={fieldState.error?.message}
                    />
                )}
            />

            <Widget title="Connector Attributes" titleSize="large" noBorder busy={successor.isFetchingAttributes}>
                {successor.descriptors.length > 0 ? (
                    <AttributeEditor
                        id="register_attributes"
                        attributeDescriptors={successor.descriptors}
                        callbackParentUuid={successor.raProfileUuid}
                        callbackResource={Resource.Certificates}
                        groupAttributesCallbackAttributes={successor.callbackAttributes}
                        setGroupAttributesCallbackAttributes={successor.setCallbackAttributes}
                    />
                ) : successor.schemaLoaded || successor.isFetchingAttributes ? (
                    <span className="text-content-subtle">This RA Profile has no connector attributes.</span>
                ) : (
                    <Container className="flex-row items-center" gap={4}>
                        <span className="text-sm text-danger" data-testid="registerAttributesNotLoaded">
                            Connector attributes could not be loaded.
                        </span>
                        <Button variant="outline" type="button" onClick={successor.loadSchema}>
                            Retry
                        </Button>
                    </Container>
                )}
            </Widget>
        </>
    );
}
