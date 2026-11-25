import { type ReactElement, useEffect } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import AttributeEditor from 'components/Attributes/AttributeEditor';
import Widget from 'components/Widget';
import { actions as signingProfileActions, selectors as signingProfileSelectors } from 'ducks/signing-profiles';
import { ManagedSigningType, type ResponseAttribute, SigningScheme } from 'types/openapi';
import OptionCards from './OptionCards';
import SigningCertificateField from './SigningCertificateField';
import { type SigningProfileFormValues, signingOperationAttributesEditorId } from './signingProfileFormValues';

const signingSchemeOptions = [{ value: SigningScheme.Managed, label: 'Managed (ILM holds the key)' }];

const managedSigningTypeOptions = [{ value: ManagedSigningType.StaticKey, label: 'Static Key — use an existing certificate' }];

interface Props {
    savedSigningOperationAttributes?: ResponseAttribute[];
}

/** Signing scheme, managed signing type and the static key's certificate with its signing operation attributes. */
export default function SigningSchemeFields({ savedSigningOperationAttributes }: Readonly<Props>): ReactElement {
    const { control, setValue } = useFormContext<SigningProfileFormValues>();
    const signingScheme = useWatch({ control, name: 'signingScheme' });
    const managedSigningType = useWatch({ control, name: 'managedSigningType' });

    return (
        <div className="space-y-4">
            <OptionCards
                name="signingScheme"
                label="Signing Scheme"
                options={signingSchemeOptions}
                selected={signingScheme}
                onSelect={(scheme) => setValue('signingScheme', scheme, { shouldDirty: true })}
            />
            {signingScheme === SigningScheme.Managed && (
                <OptionCards
                    name="managedSigningType"
                    label="Managed Signing Type"
                    options={managedSigningTypeOptions}
                    selected={managedSigningType}
                    onSelect={(type) => setValue('managedSigningType', type, { shouldDirty: true })}
                />
            )}
            {signingScheme === SigningScheme.Managed && managedSigningType === ManagedSigningType.StaticKey && (
                <>
                    <SigningCertificateField />
                    <SigningOperationAttributes savedAttributes={savedSigningOperationAttributes} />
                </>
            )}
        </div>
    );
}

/** Signing operation attributes the selected certificate's key algorithm declares. */
function SigningOperationAttributes({ savedAttributes }: Readonly<{ savedAttributes?: ResponseAttribute[] }>): ReactElement | null {
    const dispatch = useDispatch();
    const descriptors = useSelector(signingProfileSelectors.signingOperationAttributeModels);
    const isFetching = useSelector(signingProfileSelectors.isFetchingSignatureAttributes);
    const { control } = useFormContext<SigningProfileFormValues>();
    const certificateUuid = useWatch({ control, name: 'certificateUuid' });

    useEffect(() => {
        if (certificateUuid) dispatch(signingProfileActions.listSignatureAttributesForCertificate({ certificateUuid }));
    }, [dispatch, certificateUuid]);

    if (!certificateUuid) return null;
    return (
        <Widget title="Signing Operation Attributes" noBorder busy={isFetching}>
            {descriptors.length > 0 ? (
                <AttributeEditor id={signingOperationAttributesEditorId} attributeDescriptors={descriptors} attributes={savedAttributes} />
            ) : (
                !isFetching && (
                    <p className="text-xs text-content-subtle">
                        No signing operation attributes are available for the selected certificate's key algorithm.
                    </p>
                )
            )}
        </Widget>
    );
}
