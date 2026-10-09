import { actions as certificateActions, selectors as certificateSelectors } from 'ducks/certificates';
import { actions as connectorActions } from 'ducks/connectors';
import { useEffect, useMemo, useState } from 'react';
import { type FieldValues, type UseFormReturn, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import type { AttributeDescriptorModel } from 'types/attributes';
import type { CertificateDetailResponseModel, CertificateRegistrationRequestModel } from 'types/certificate';
import { CertificateRegistrationState } from 'types/openapi';
import { collectFormAttributes } from 'utils/attributes/attributes';
import { validateRegistrationChallenge } from 'utils/validators';
import { replaySourceIdentity, toRequestAttributes } from './successorIdentity';

export type SuccessorFormValues = {
    // A new, independent challenge for the staged successor; nothing is inherited from the source certificate.
    successorAuthorizationSecret?: string;
    successorExpiresAt?: string;
};

export function useSuccessorRegistration<T extends SuccessorFormValues>(
    certificate: CertificateDetailResponseModel,
    form: UseFormReturn<T>,
) {
    const dispatch = useDispatch();
    const { control, setValue, clearErrors } = form as unknown as UseFormReturn<SuccessorFormValues>;

    const [callbackAttributes, setCallbackAttributes] = useState<AttributeDescriptorModel[]>([]);

    const isRegistering = useSelector(certificateSelectors.isRegistering);
    const registerErrorMessage = useSelector(certificateSelectors.registerErrorMessage);
    const registerAttributeDescriptors = useSelector(certificateSelectors.registerAttributes);
    const isFetchingAttributes = useSelector(certificateSelectors.isFetchingRegisterAttributes);

    const raProfileUuid = certificate.raProfile?.uuid;
    const authorityUuid = certificate.raProfile?.authorityInstanceUuid;
    const descriptors = (raProfileUuid && registerAttributeDescriptors[raProfileUuid]) || [];
    const identity = useMemo(() => replaySourceIdentity(certificate), [certificate]);
    const sourceHasChallenge = certificate.registration?.state === CertificateRegistrationState.Active;

    // Start each session with a clean slate so a stale error from a previous attempt never lingers,
    // and clear it again on unmount.
    useEffect(() => {
        dispatch(certificateActions.clearRegisterErrors());
        return () => {
            dispatch(certificateActions.clearRegisterErrors());
        };
    }, [dispatch]);

    const authorizationSecret = useWatch({ control, name: 'successorAuthorizationSecret' });
    const expiresAt = useWatch({ control, name: 'successorExpiresAt' });

    // Core treats a blank secret as none (String.isBlank).
    const hasChallenge = !!authorizationSecret?.trim();

    useEffect(() => {
        // An issuance window without a challenge is rejected by Core, so a date entered and then abandoned must not
        // survive clearing the challenge.
        if (!hasChallenge) {
            setValue('successorExpiresAt', undefined);
            clearErrors('successorExpiresAt');
        }
    }, [hasChallenge, setValue, clearErrors]);

    // Requested when the operator opts in, not from an effect, so the not-loaded state never shows before the request
    // has gone out.
    const loadSchema = () => {
        if (raProfileUuid && authorityUuid) dispatch(certificateActions.getRegisterAttributes({ raProfileUuid, authorityUuid }));
    };
    // A failed load removes the profile's entry, while an authority without register support answers with an empty
    // list; only a present entry means Core's register schema is known.
    const schemaLoaded = !raProfileUuid || raProfileUuid in registerAttributeDescriptors;

    const clearValues = () => {
        setValue('successorAuthorizationSecret', undefined);
        setValue('successorExpiresAt', undefined);
        setCallbackAttributes([]);
        // A callback payload left in the store is replayed by the next editor to mount, restoring its fields.
        dispatch(connectorActions.clearCallbackData());
        dispatch(certificateActions.clearRegisterErrors());
    };

    const identityPresent = Object.keys(identity.request).length > 0;
    // A successor registered without some of the source's SANs would never match a holder enrolling with the source's
    // identity: Core's CMP registration matching compares SAN sets exactly.
    const identityReplayable = identity.kind !== 'flat' || identity.omittedSanTypes.length === 0;
    const challengeValid = !validateRegistrationChallenge()(authorizationSecret);
    const windowValid = !expiresAt || new Date(expiresAt) > new Date();
    const canRegister =
        identityPresent &&
        identityReplayable &&
        challengeValid &&
        windowValid &&
        // A blank challenge on a successor of a challenge-protected certificate would silently drop that protection
        // for the new branch.
        (!sourceHasChallenge || hasChallenge) &&
        !isFetchingAttributes &&
        // Registering without a loaded schema skips required connector attributes; on a connector-backed authority Core
        // then fails the placeholder it has already created.
        schemaLoaded;

    const buildRequest = (values: SuccessorFormValues & FieldValues): CertificateRegistrationRequestModel => ({
        ...identity.request,
        sourceCertificateUuid: certificate.uuid,
        authorizationSecret: hasChallenge ? values.successorAuthorizationSecret : undefined,
        expiresAt: hasChallenge && values.successorExpiresAt ? new Date(values.successorExpiresAt).toISOString() : undefined,
        attributes: collectFormAttributes('register_attributes', [...descriptors, ...callbackAttributes], values),
        // Carried over as Core's own renew does, so a required certificate custom attribute is satisfied.
        customAttributes: toRequestAttributes(certificate.customAttributes),
    });

    return {
        raProfileUuid,
        identity,
        identityPresent,
        identityReplayable,
        sourceHasChallenge,
        hasChallenge,
        descriptors,
        callbackAttributes,
        setCallbackAttributes,
        isFetchingAttributes,
        schemaLoaded,
        loadSchema,
        clearValues,
        canRegister,
        buildRequest,
        isRegistering,
        registerErrorMessage,
    };
}

export type SuccessorRegistration = ReturnType<typeof useSuccessorRegistration>;
