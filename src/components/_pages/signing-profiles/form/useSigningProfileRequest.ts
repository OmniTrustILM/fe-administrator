import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectors as customAttributesSelectors } from 'ducks/customAttributes';
import { selectors as signingProfileSelectors } from 'ducks/signing-profiles';
import { Resource, type SigningProfileRequestDto, SigningWorkflowType, type WorkflowInterface } from 'types/openapi';
import { collectFormAttributes } from 'utils/attributes/attributes';
import { isContentSigningWorkflow, isRawSigningWorkflow } from 'utils/type-guards';
import { contentSigningAttributesEditorId, contentSigningWorkflowRequest } from './ContentSigningWorkflowFields';
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
    const contentSigningDescriptors = useSelector(signingProfileSelectors.contentSigningProfileAttributeModels);
    const contentSigningRequestDescriptors = useSelector(signingProfileSelectors.contentSigningRequestAttributeDescriptors);

    const workflowRequest = useCallback(
        (values: SigningProfileFormValues): SigningProfileRequestDto['workflow'] => {
            if (values.workflowType === SigningWorkflowType.ContentSigning) {
                return contentSigningWorkflowRequest(
                    values,
                    collectFormAttributes(contentSigningAttributesEditorId, contentSigningDescriptors, values),
                    contentSigningRequestDescriptors,
                    savedWorkflow && isContentSigningWorkflow(savedWorkflow) ? savedWorkflow : undefined,
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
        [contentSigningDescriptors, contentSigningRequestDescriptors, timestampingDescriptors, savedWorkflow],
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
