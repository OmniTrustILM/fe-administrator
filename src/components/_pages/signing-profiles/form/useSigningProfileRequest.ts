import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectors as customAttributesSelectors } from 'ducks/customAttributes';
import { selectors as signingProfileSelectors } from 'ducks/signing-profiles';
import { Resource, type SigningProfileRequestDto, SigningWorkflowType, type WorkflowInterface } from 'types/openapi';
import { collectFormAttributes } from 'utils/attributes/attributes';
import { isRawSigningWorkflow } from 'utils/type-guards';
import { collectContentSigningAttributes, contentSigningWorkflowRequest } from './ContentSigningWorkflowFields';
import { permissionNamesOf } from './requestAttributePermissions';
import {
    customAttributesEditorId,
    rawSigningWorkflowRequest,
    recordPolicyRequest,
    type SigningProfileFormValues,
    signingOperationAttributesEditorId,
    signingSchemeRequest,
    timestampingAttributesEditorId,
    timestampingWorkflowRequest,
} from './signingProfileFormValues';

export const signingProfileCustomAttributes = customAttributesSelectors.multipleResourceCustomAttributes([Resource.SigningProfiles]);

/** Builds the profile request from the form values, collecting each attribute editor against the descriptors it shows. */
export function useSigningProfileRequest(
    savedWorkflow: WorkflowInterface | undefined,
): (values: SigningProfileFormValues) => SigningProfileRequestDto {
    const customAttributeDescriptors = useSelector(signingProfileCustomAttributes)[Resource.SigningProfiles];
    const signingOperationDescriptors = useSelector(signingProfileSelectors.signingOperationAttributeModels);
    const timestampingDescriptors = useSelector(signingProfileSelectors.signatureFormattingConnectorAttributeModels);
    const contentSigningDescriptors = useSelector(signingProfileSelectors.contentSigningProfileAndRequestAttributeModels);
    const requestAttributeDescriptors = useSelector(signingProfileSelectors.contentSigningRequestAttributeDescriptors);

    const workflowRequest = useCallback(
        (values: SigningProfileFormValues): SigningProfileRequestDto['workflow'] => {
            if (values.workflowType === SigningWorkflowType.ContentSigning) {
                return contentSigningWorkflowRequest(
                    values,
                    collectContentSigningAttributes(contentSigningDescriptors, values),
                    permissionNamesOf(requestAttributeDescriptors),
                );
            }
            if (values.workflowType === SigningWorkflowType.RawSigning && savedWorkflow && isRawSigningWorkflow(savedWorkflow)) {
                return rawSigningWorkflowRequest(savedWorkflow);
            }
            return timestampingWorkflowRequest(
                values,
                collectFormAttributes(timestampingAttributesEditorId, timestampingDescriptors, values),
            );
        },
        [contentSigningDescriptors, requestAttributeDescriptors, timestampingDescriptors, savedWorkflow],
    );

    return useCallback(
        (values) => ({
            name: values.name,
            description: values.description || undefined,
            workflow: workflowRequest(values),
            signingScheme: signingSchemeRequest(
                values,
                collectFormAttributes(signingOperationAttributesEditorId, signingOperationDescriptors, values),
            ),
            recordPolicy: recordPolicyRequest(values),
            customAttributes: collectFormAttributes(customAttributesEditorId, customAttributeDescriptors, values),
        }),
        [customAttributeDescriptors, signingOperationDescriptors, workflowRequest],
    );
}
