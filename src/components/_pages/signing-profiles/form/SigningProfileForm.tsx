import { useEffect, useRef, useState } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router';

import AttributeEditor from 'components/Attributes/AttributeEditor';
import Breadcrumb from 'components/Breadcrumb';
import Button from 'components/Button';
import Container from 'components/Container';
import TabLayout from 'components/Layout/TabLayout';
import ProgressButton from 'components/ProgressButton';
import Widget from 'components/Widget';

import { actions as customAttributesActions, selectors as customAttributesSelectors } from 'ducks/customAttributes';
import { getEnumLabel, selectors as enumSelectors } from 'ducks/enums';
import { actions as signingProfileActions, selectors as signingProfileSelectors } from 'ducks/signing-profiles';
import { PlatformEnum, Resource, SigningWorkflowType } from 'types/openapi';
import { isContentSigningWorkflow, isStaticKeyManagedSigning, isTimestampingWorkflow } from 'utils/type-guards';

import ContentSigningWorkflowFields from './ContentSigningWorkflowFields';
import GeneralFields, { workflowTypeLabels } from './GeneralFields';
import RecordPolicyFields from './RecordPolicyFields';
import SigningSchemeFields from './SigningSchemeFields';
import {
    customAttributeFormValues,
    customAttributesEditorId,
    formValuesOf,
    newFormValues,
    type SigningProfileFormValues,
} from './signingProfileFormValues';
import TimestampingWorkflowFields, { timestampingConnectorList } from './TimestampingWorkflowFields';
import { signingProfileCustomAttributes, useSigningProfileRequest } from './useSigningProfileRequest';

export default function SigningProfileForm() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { id } = useParams();
    const editMode = !!id;

    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const loadedProfile = useSelector(signingProfileSelectors.signingProfile);
    const isFetchingDetail = useSelector(signingProfileSelectors.isFetchingDetail);
    const isCreating = useSelector(signingProfileSelectors.isCreating);
    const isUpdating = useSelector(signingProfileSelectors.isUpdating);
    const isFetchingConnectors = useSelector(timestampingConnectorList).isFetching;
    const isFetchingSigningCertificates = useSelector(signingProfileSelectors.isFetchingSigningCertificates);
    const isFetchingSignatureAttributes = useSelector(signingProfileSelectors.isFetchingSignatureAttributes);
    const isFetchingCustomAttributes = useSelector(customAttributesSelectors.isFetchingResourceCustomAttributes);
    const customAttributeDescriptors = useSelector(signingProfileCustomAttributes);
    const contentSigningAttributesListedFor = useSelector(signingProfileSelectors.contentSigningAttributesListedFor);

    const savedProfile = editMode && loadedProfile?.uuid === id ? loadedProfile : undefined;
    const savedWorkflow = savedProfile?.workflow;
    const savedSigningScheme = savedProfile?.signingScheme;
    const savedContentSigningWorkflow = savedWorkflow && isContentSigningWorkflow(savedWorkflow) ? savedWorkflow : undefined;
    const savedTimestampingWorkflow = savedWorkflow && isTimestampingWorkflow(savedWorkflow) ? savedWorkflow : undefined;
    const savedSigningOperationAttributes =
        savedSigningScheme && isStaticKeyManagedSigning(savedSigningScheme) ? savedSigningScheme.signingOperationAttributes : undefined;

    const [initialValues] = useState(() => newFormValues(customAttributeFormValues(savedProfile, customAttributeDescriptors)));
    const methods = useForm<SigningProfileFormValues>({ defaultValues: initialValues, mode: 'onChange' });
    const {
        handleSubmit,
        control,
        formState: { isSubmitting, isValid, isDirty },
        reset,
    } = methods;
    const [workflowType, connectorUuid, familyCode, level] = useWatch({
        control,
        name: ['workflowType', 'signatureFormattingConnectorUuid', 'signatureFamilyCode', 'signatureLevel'],
    });
    const buildRequest = useSigningProfileRequest(savedWorkflow);
    const [activeTab, setActiveTab] = useState(0);

    useEffect(() => {
        dispatch(
            customAttributesActions.loadMultipleResourceCustomAttributes([{ resource: Resource.SigningProfiles, customAttributes: [] }]),
        );
    }, [dispatch]);

    useEffect(() => {
        if (id) dispatch(signingProfileActions.getSigningProfile({ uuid: id }));
    }, [dispatch, id]);

    // The form takes the profile's values once per profile, so a later reload keeps the operator's edits.
    const resetForIdRef = useRef<string | undefined>(undefined);
    useEffect(() => {
        if (!id || isFetchingDetail || loadedProfile?.uuid !== id || resetForIdRef.current === id) return;
        reset(formValuesOf(loadedProfile, customAttributeFormValues(loadedProfile, customAttributeDescriptors)));
        resetForIdRef.current = id;
    }, [id, isFetchingDetail, loadedProfile, customAttributeDescriptors, reset]);

    // Core replaces every saved formatting value with those collected from the listing, so saving waits for it.
    const formattingAttributesListed =
        workflowType !== SigningWorkflowType.ContentSigning ||
        (contentSigningAttributesListedFor?.connectorUuid === connectorUuid &&
            contentSigningAttributesListedFor.family === familyCode &&
            contentSigningAttributesListedFor.level === level);

    const isBusy =
        isFetchingDetail ||
        isCreating ||
        isUpdating ||
        isFetchingConnectors ||
        isFetchingSigningCertificates ||
        isFetchingSignatureAttributes ||
        isFetchingCustomAttributes;

    const onSubmit = (values: SigningProfileFormValues) => {
        const signingProfileRequestDto = buildRequest(values);
        if (id) dispatch(signingProfileActions.updateSigningProfile({ uuid: id, signingProfileRequestDto }));
        else dispatch(signingProfileActions.createSigningProfile({ signingProfileRequestDto }));
    };

    const workflowFields = {
        [SigningWorkflowType.Timestamping]: (
            <TimestampingWorkflowFields signingProfileUuid={id} savedWorkflow={savedTimestampingWorkflow} />
        ),
        [SigningWorkflowType.ContentSigning]: (
            <ContentSigningWorkflowFields signingProfileUuid={id} savedWorkflow={savedContentSigningWorkflow} />
        ),
        [SigningWorkflowType.RawSigning]: <p className="text-sm text-content-muted">The raw-signing workflow is kept as saved.</p>,
    }[workflowType];

    const tabs = [
        { title: '1 · General', content: <GeneralFields /> },
        { title: `2 · ${workflowTypeLabels[workflowType] ?? 'Signing Workflow'} Properties`, content: workflowFields },
        { title: '3 · Signing Scheme', content: <SigningSchemeFields savedSigningOperationAttributes={savedSigningOperationAttributes} /> },
        { title: '4 · Record Policy', content: <RecordPolicyFields /> },
        {
            title: '5 · Custom Attributes',
            content: (
                <Widget title="Custom Attributes" noBorder busy={isFetchingCustomAttributes}>
                    <AttributeEditor
                        id={customAttributesEditorId}
                        attributeDescriptors={customAttributeDescriptors[Resource.SigningProfiles] || []}
                        attributes={savedProfile?.customAttributes}
                    />
                </Widget>
            ),
        },
    ];

    const formTitle = editMode ? 'Edit Signing Profile' : 'Create Signing Profile';

    return (
        <Container>
            <Breadcrumb
                items={[
                    {
                        label: `${getEnumLabel(resourceEnum, Resource.SigningProfiles)} Inventory`,
                        href: `/${Resource.SigningProfiles.toLowerCase()}`,
                    },
                    { label: savedProfile?.name || formTitle, href: '' },
                ]}
            />
            <FormProvider {...methods}>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <Widget title={formTitle} busy={isBusy} titleSize="large">
                        <TabLayout selectedTab={activeTab} onTabChange={setActiveTab} onlyActiveTabContent={false} tabs={tabs} />
                        <Container className="flex-row justify-end mt-4" gap={4}>
                            <Button variant="outline" onClick={() => void navigate(-1)} disabled={isSubmitting} type="button">
                                Cancel
                            </Button>
                            <ProgressButton
                                title={editMode ? 'Update' : 'Create'}
                                inProgressTitle={editMode ? 'Updating...' : 'Creating...'}
                                inProgress={isSubmitting || isCreating || isUpdating}
                                disabled={
                                    !isDirty || isSubmitting || !isValid || !formattingAttributesListed || isFetchingSigningCertificates
                                }
                                type="submit"
                            />
                        </Container>
                    </Widget>
                </form>
            </FormProvider>
        </Container>
    );
}
