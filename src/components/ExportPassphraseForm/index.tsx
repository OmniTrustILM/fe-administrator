import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import AttributeEditor from 'components/Attributes/AttributeEditor';
import Button from 'components/Button';
import Callout from 'components/Callout';
import InfoNote from 'components/InfoNote';
import PassphraseFields, { type PassphraseFormValues } from 'components/PassphraseFields';
import ProgressButton from 'components/ProgressButton';
import RetryCallout from 'components/RetryCallout';
import { actions as cryptographicKeysActions, selectors as cryptographicKeysSelectors } from 'ducks/cryptographic-keys';
import { transformAttributeDescriptorDtoToModel, transformAttributeRequestModelToDto } from 'ducks/transform/attributes';
import type { RequestAttribute } from 'types/openapi';
import { collectFormAttributes } from 'utils/attributes/attributes';
import { useRunOnFinish } from 'utils/common-hooks';

const ATTRIBUTES_ID = 'exportKey';

type Props = Readonly<{
    keyUuid: string;
    keyItemUuid: string;
    info: ReactNode;
    submitLabel: string;
    busyLabel: string;
    busy: boolean;
    /** Core's refusal of the last request, shown in the form once it has sent one. */
    error?: string;
    onSubmit: (request: { passphrase: string; exportAttributes: RequestAttribute[] }) => void;
    onCancel: () => void;
}>;

/** The passphrase fields plus the provider's export attribute schema, for a PKCS#12 download or a key export. Owns
 * the react-hook-form state, so the passphrase never leaves this form's own values. */
export default function ExportPassphraseForm({
    keyUuid,
    keyItemUuid,
    info,
    submitLabel,
    busyLabel,
    busy,
    error,
    onSubmit,
    onCancel,
}: Props) {
    const dispatch = useDispatch();
    const listedSchema = useSelector(cryptographicKeysSelectors.exportKeyAttributes);
    const schema = listedSchema?.request.uuid === keyUuid && listedSchema.request.keyItemUuid === keyItemUuid ? listedSchema : undefined;

    const methods = useForm<PassphraseFormValues>({
        defaultValues: { passphrase: '', passphraseConfirmation: '' },
        mode: 'onChange',
    });
    const { handleSubmit, reset, resetField } = methods;
    const [submitted, setSubmitted] = useState(false);

    const listSchema = useCallback(
        () => dispatch(cryptographicKeysActions.listExportKeyAttributeDescriptors({ uuid: keyUuid, keyItemUuid })),
        [dispatch, keyUuid, keyItemUuid],
    );

    useEffect(() => {
        listSchema();
    }, [listSchema]);

    useEffect(() => () => reset(), [reset]);

    // The passphrase is dropped as soon as a request finishes, whatever its outcome.
    const clearPassphrase = useCallback(() => {
        resetField('passphrase');
        resetField('passphraseConfirmation');
    }, [resetField]);
    useRunOnFinish(busy, clearPassphrase);

    const exportAttributeDescriptors = useMemo(
        () => (schema?.status === 'loaded' ? schema.descriptors.map(transformAttributeDescriptorDtoToModel) : []),
        [schema],
    );

    const submit = useCallback(
        (values: PassphraseFormValues) => {
            const exportAttributes = collectFormAttributes(ATTRIBUTES_ID, exportAttributeDescriptors, values).map(
                transformAttributeRequestModelToDto,
            );
            setSubmitted(true);
            onSubmit({ passphrase: values.passphrase, exportAttributes });
        },
        [exportAttributeDescriptors, onSubmit],
    );

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(submit)} className="space-y-4">
                <PassphraseFields />
                {schema?.status === 'failed' && <RetryCallout message={schema.error} onRetry={listSchema} />}
                {exportAttributeDescriptors.length > 0 && (
                    <AttributeEditor id={ATTRIBUTES_ID} attributeDescriptors={exportAttributeDescriptors} />
                )}
                {submitted && error && (
                    <Callout severity="danger" role="alert">
                        {error}
                    </Callout>
                )}
                <InfoNote>{info}</InfoNote>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" type="button" disabled={busy} onClick={onCancel}>
                        Cancel
                    </Button>
                    <ProgressButton
                        type="submit"
                        inProgress={busy}
                        title={submitLabel}
                        inProgressTitle={busyLabel}
                        disabled={schema?.status !== 'loaded'}
                    />
                </div>
            </form>
        </FormProvider>
    );
}
