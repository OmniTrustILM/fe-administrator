import AttributeEditor from 'components/Attributes/AttributeEditor';
import AttributeViewer, { ATTRIBUTE_VIEWER_TYPE } from 'components/Attributes/AttributeViewer';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import DetailPageSkeleton from 'components/DetailPageSkeleton';
import Dialog from 'components/Dialog';
import ProgressButton from 'components/ProgressButton';
import Spinner from 'components/Spinner';
import StatusBadge from 'components/StatusBadge';
import CertificateList from 'components/_pages/certificates/list';

import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';

import { actions, selectors } from 'ducks/locations';
import { actions as raActions, selectors as raSelectors } from 'ducks/ra-profiles';
import React, { type Dispatch, type SetStateAction, useCallback, useEffect, useMemo, useState } from 'react';
import { useRunOnSuccessfulFinish } from 'utils/common-hooks';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router';
import LocationForm from '../form';
import Badge from 'components/Badge';
import type { AttributeDescriptorModel } from 'types/attributes';
import Button from 'components/Button';
import { buildValidationRules } from 'utils/validators-helper';
import { collectFormAttributes, getAttributeContent } from 'utils/attributes/attributes';
import { actions as customAttributesActions, selectors as customAttributesSelectors } from '../../../../ducks/customAttributes';

import { LockWidgetNameEnum } from 'types/user-interface';
import { validateRequired } from 'utils/validators';
import { CertificateState, PlatformEnum, Resource } from '../../../../types/openapi';
import CustomAttributeWidget from '../../../Attributes/CustomAttributeWidget';
import TabLayout from '../../../Layout/TabLayout';
import CertificateStatusBadge from '../../../_pages/certificates/CertificateStatus';

import { createWidgetDetailHeaders } from 'utils/widget';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import Container from 'components/Container';
import Breadcrumb from 'components/Breadcrumb';
import Select from 'components/Select';
import { ArrowRight } from 'lucide-react';

const PushCertificateForm = ({
    selectedCerts,
    location,
    pushAttributeDescriptors,
    pushGroupAttributesCallbackAttributes,
    setPushGroupAttributesCallbackAttributes,
    isPushingCertificate,
    setPushDialog,
}: {
    selectedCerts: string[];
    location: any;
    pushAttributeDescriptors: AttributeDescriptorModel[];
    pushGroupAttributesCallbackAttributes: AttributeDescriptorModel[];
    setPushGroupAttributesCallbackAttributes: Dispatch<SetStateAction<AttributeDescriptorModel[]>>;
    isPushingCertificate: boolean;
    setPushDialog: (open: boolean) => void;
}) => {
    const dispatch = useDispatch();
    const methods = useForm({
        mode: 'onTouched',
        defaultValues: {},
    });

    const { handleSubmit, formState, control } = methods;
    const allValues = useWatch({ control });

    const onSubmit = (values: any) => {
        if (selectedCerts.length === 0 || !location) return;

        const attrs = collectFormAttributes(
            'pushAttributes',
            [...(pushAttributeDescriptors ?? []), ...pushGroupAttributesCallbackAttributes],
            allValues,
        );

        selectedCerts.forEach((certUuid) => {
            dispatch(
                actions.pushCertificate({
                    entityUuid: location.entityInstanceUuid,
                    locationUuid: location.uuid,
                    certificateUuid: certUuid,
                    pushRequest: { attributes: attrs },
                }),
            );
        });
        setPushDialog(false);
    };

    const isDisabled = useMemo(() => {
        return !formState.isDirty || formState.isSubmitting || !formState.isValid || selectedCerts.length === 0;
    }, [formState.isDirty, formState.isSubmitting, formState.isValid, selectedCerts.length]);

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <AttributeEditor
                    id="pushAttributes"
                    attributeDescriptors={pushAttributeDescriptors || []}
                    groupAttributesCallbackAttributes={pushGroupAttributesCallbackAttributes}
                    setGroupAttributesCallbackAttributes={setPushGroupAttributesCallbackAttributes}
                />

                <Container className="flex-row justify-end modal-footer" gap={4}>
                    <Button type="button" variant="outline" disabled={formState.isSubmitting} onClick={() => setPushDialog(false)}>
                        Cancel
                    </Button>
                    <ProgressButton inProgress={isPushingCertificate} title="Push" type="submit" color="primary" disabled={isDisabled} />
                </Container>
            </form>
        </FormProvider>
    );
};

const IssueCertificateForm = ({
    location,
    issuanceAttributeDescriptors,
    issueGroupAttributesCallbackAttributes,
    setIssueGroupAttributesCallbackAttributes,
    csrAttributeDescriptors,
    csrGroupAttributesCallbackAttributes,
    setCsrGroupAttributesCallbackAttributes,
    resourceCustomAttributes,
    raProfiles,
    isPushingCertificate,
    setIssueDialog,
}: {
    location: any;
    issuanceAttributeDescriptors: AttributeDescriptorModel[];
    issueGroupAttributesCallbackAttributes: AttributeDescriptorModel[];
    setIssueGroupAttributesCallbackAttributes: Dispatch<SetStateAction<AttributeDescriptorModel[]>>;
    csrAttributeDescriptors: AttributeDescriptorModel[];
    csrGroupAttributesCallbackAttributes: AttributeDescriptorModel[];
    setCsrGroupAttributesCallbackAttributes: Dispatch<SetStateAction<AttributeDescriptorModel[]>>;
    resourceCustomAttributes: AttributeDescriptorModel[];
    raProfiles: any[];
    isPushingCertificate: boolean;
    setIssueDialog: (open: boolean) => void;
}) => {
    const dispatch = useDispatch();
    const methods = useForm<{ raProfile: { value: string; label: string } }>({
        mode: 'onTouched',
        defaultValues: { raProfile: undefined as any },
    });

    const { handleSubmit, formState, control } = methods;
    const allValues = useWatch({ control });

    const onSubmit = (values: { raProfile: { value: string; label: string } }) => {
        if (!location) return;

        const issueAttrs = collectFormAttributes(
            'issueAttributes',
            [...(issuanceAttributeDescriptors ?? []), ...issueGroupAttributesCallbackAttributes],
            allValues,
        );
        const csrAttrs = collectFormAttributes(
            'csrAttributes',
            [...(csrAttributeDescriptors ?? []), ...csrGroupAttributesCallbackAttributes],
            allValues,
        );
        const certificateCustomAttributes = collectFormAttributes('customCertificate', resourceCustomAttributes, allValues);
        dispatch(
            actions.issueCertificate({
                entityUuid: location.entityInstanceUuid,
                locationUuid: location.uuid,
                issueRequest: {
                    raProfileUuid: values.raProfile.value.split(':#')[0],
                    csrAttributes: csrAttrs,
                    issueAttributes: issueAttrs,
                    certificateCustomAttributes: certificateCustomAttributes,
                },
            }),
        );
        setIssueDialog(false);
    };

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Controller
                    name="raProfile"
                    control={control}
                    rules={buildValidationRules([validateRequired()])}
                    render={({ field, fieldState }) => {
                        let errorMessage: string | undefined;
                        if (fieldState.error && fieldState.isTouched) {
                            errorMessage =
                                typeof fieldState.error === 'string' ? fieldState.error : fieldState.error?.message || 'Required Field';
                        }
                        return (
                            <Select
                                {...field}
                                label="RA Profile"
                                id="certificateSelect"
                                placeholder="Select RA profile"
                                options={raProfiles.map((p) => ({
                                    value: `${p.uuid}:#${p.authorityInstanceUuid}`,
                                    label: p.name,
                                }))}
                                error={errorMessage}
                                onChange={(value) => {
                                    field.onChange(value);
                                    if (value) {
                                        const [uuid, authorityInstanceUuid] = (value as string).split(':#');
                                        dispatch(
                                            raActions.listIssuanceAttributeDescriptors({
                                                authorityUuid: authorityInstanceUuid,
                                                uuid,
                                            }),
                                        );
                                    }
                                }}
                            />
                        );
                    }}
                />

                <TabLayout
                    onlyActiveTabContent={false}
                    tabs={[
                        {
                            title: 'Certificate Signing Request Attributes',
                            content: csrAttributeDescriptors ? (
                                <AttributeEditor
                                    id="csrAttributes"
                                    attributeDescriptors={csrAttributeDescriptors}
                                    groupAttributesCallbackAttributes={csrGroupAttributesCallbackAttributes}
                                    setGroupAttributesCallbackAttributes={setCsrGroupAttributesCallbackAttributes}
                                />
                            ) : null,
                        },
                        {
                            title: 'RA Profile Issue Attributes',
                            content: issuanceAttributeDescriptors ? (
                                <AttributeEditor
                                    id="issueAttributes"
                                    attributeDescriptors={issuanceAttributeDescriptors}
                                    groupAttributesCallbackAttributes={issueGroupAttributesCallbackAttributes}
                                    setGroupAttributesCallbackAttributes={setIssueGroupAttributesCallbackAttributes}
                                />
                            ) : null,
                        },
                        {
                            title: 'Certificate Custom Attributes',
                            content: <AttributeEditor id="customCertificate" attributeDescriptors={resourceCustomAttributes || []} />,
                        },
                    ]}
                />

                <Container className="flex-row justify-end modal-footer" gap={4}>
                    <Button
                        type="button"
                        variant="outline"
                        color="secondary"
                        disabled={formState.isSubmitting}
                        onClick={() => setIssueDialog(false)}
                    >
                        Cancel
                    </Button>
                    <ProgressButton
                        inProgress={isPushingCertificate}
                        title="Issue"
                        type="submit"
                        color="primary"
                        disabled={!formState.isDirty || formState.isSubmitting || !formState.isValid}
                    />
                </Container>
            </form>
        </FormProvider>
    );
};

export default function LocationDetail() {
    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const dispatch = useDispatch();

    const { entityId, id } = useParams();

    const location = useSelector(selectors.location);
    const pushAttributeDescriptors = useSelector(selectors.pushAttributeDescriptors);
    const csrAttributeDescriptors = useSelector(selectors.csrAttributeDescriptors);
    const raProfiles = useSelector(raSelectors.raProfiles);
    const issuanceAttributeDescriptors = useSelector(raSelectors.issuanceAttributes);

    const resourceCustomAttributes = useSelector(customAttributesSelectors.secondaryResourceCustomAttributes);
    const isFetchingResourceCustomAttributes = useSelector(customAttributesSelectors.isFetchingResourceCustomAttributes);

    const isFetching = useSelector(selectors.isFetchingDetail);
    const isDeleting = useSelector(selectors.isDeleting);
    const isUpdating = useSelector(selectors.isUpdating);
    const updateLocationSucceeded = useSelector(selectors.updateLocationSucceeded);
    const isFetchingPushAttributeDescriptors = useSelector(selectors.isFetchingPushAttributeDescriptors);
    const isFetchingCSRAttributeDescriptors = useSelector(selectors.isFetchingCSRAttributeDescriptors);
    const isPushingCertificate = useSelector(selectors.isPushingCertificate);
    const isIssuingCertificate = useSelector(selectors.isIssuingCertificate);
    const isRemovingCertificate = useSelector(selectors.isRemovingCertificate);
    const isRenewingCertificate = useSelector(selectors.isAutoRenewingCertificate);
    const isSyncing = useSelector(selectors.isSyncing);

    const isFetchingRaProfiles = useSelector(raSelectors.isFetchingList);
    const isFetchingIssuanceAttributes = useSelector(raSelectors.isFetchingIssuanceAttributes);

    const [issueGroupAttributesCallbackAttributes, setIssueGroupAttributesCallbackAttributes] = useState<AttributeDescriptorModel[]>([]);
    const [pushGroupAttributesCallbackAttributes, setPushGroupAttributesCallbackAttributes] = useState<AttributeDescriptorModel[]>([]);
    const [csrGroupAttributesCallbackAttributes, setCsrGroupAttributesCallbackAttributes] = useState<AttributeDescriptorModel[]>([]);

    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

    const [confirmRemoveDialog, setConfirmRemoveDialog] = useState<boolean>(false);
    const [issueDialog, setIssueDialog] = useState<boolean>(false);
    const [pushDialog, setPushDialog] = useState<boolean>(false);

    const [certCheckedRows, setCertCheckedRows] = useState<string[]>([]);

    const [selectedCerts, setSelectedCerts] = useState<string[]>([]);

    const isBusy = useMemo(
        () =>
            isFetching ||
            isDeleting ||
            isFetchingPushAttributeDescriptors ||
            isFetchingCSRAttributeDescriptors ||
            isFetchingResourceCustomAttributes,
        [isFetching, isDeleting, isFetchingPushAttributeDescriptors, isFetchingCSRAttributeDescriptors, isFetchingResourceCustomAttributes],
    );

    const getFreshLocationDetails = useCallback(() => {
        dispatch(customAttributesActions.listSecondaryResourceCustomAttributes(Resource.Certificates));

        if (!id || !entityId) return;
        dispatch(actions.getLocationDetail({ entityUuid: entityId!, uuid: id! }));
    }, [dispatch, entityId, id]);

    useEffect(() => {
        getFreshLocationDetails();
    }, [id, getFreshLocationDetails]);

    useEffect(() => {
        if (!id || !entityId || !location?.uuid) return;

        if (location.enabled) {
            dispatch(actions.getPushAttributes({ entityUuid: entityId, uuid: id }));
            dispatch(actions.getCSRAttributes({ entityUuid: entityId, uuid: id }));
        }
    }, [dispatch, id, location, entityId]);

    useEffect(() => {
        if (!isPushingCertificate) setPushDialog(false);
    }, [isPushingCertificate]);

    useEffect(() => {
        if (!issueDialog) return;

        dispatch(raActions.resetState());
        dispatch(raActions.listRaProfiles());
    }, [dispatch, issueDialog]);

    useRunOnSuccessfulFinish(isUpdating, updateLocationSucceeded, () => {
        setIsEditModalOpen(false);
        getFreshLocationDetails();
    });

    const handleOpenEditModal = useCallback(() => {
        if (!location) return;
        setIsEditModalOpen(true);
    }, [location]);

    const handleCloseEditModal = useCallback(() => {
        setIsEditModalOpen(false);
    }, []);

    const onEditClick = useCallback(() => {
        handleOpenEditModal();
    }, [handleOpenEditModal]);

    const onEnableClick = useCallback(() => {
        if (!location) return;
        dispatch(actions.enableLocation({ entityUuid: location.entityInstanceUuid, uuid: location.uuid }));
    }, [dispatch, location]);

    const onDisableClick = useCallback(() => {
        if (!location) return;
        dispatch(actions.disableLocation({ entityUuid: location.entityInstanceUuid, uuid: location.uuid }));
    }, [dispatch, location]);

    const onRemoveConfirmed = useCallback(() => {
        if (!location || certCheckedRows.length === 0) return;

        certCheckedRows.forEach((certUuid) => {
            dispatch(
                actions.removeCertificate({
                    entityUuid: location.entityInstanceUuid,
                    locationUuid: location.uuid,
                    certificateUuid: certUuid,
                }),
            );
        });

        setConfirmRemoveDialog(false);
        setCertCheckedRows([]);
    }, [dispatch, location, certCheckedRows]);

    const onRenewClick = useCallback(() => {
        if (!location) return;

        for (const certUuid of certCheckedRows) {
            dispatch(
                actions.autoRenewCertificate({
                    entityUuid: location.entityInstanceUuid,
                    locationUuid: location.uuid,
                    certificateUuid: certUuid,
                }),
            );
        }
    }, [certCheckedRows, dispatch, location]);

    const onSyncClick = useCallback(() => {
        if (!location) return;

        dispatch(actions.syncLocation({ entityUuid: location.entityInstanceUuid, uuid: location.uuid }));
    }, [dispatch, location]);

    const onDeleteConfirmed = useCallback(() => {
        if (!location) return;

        dispatch(actions.deleteLocation({ entityUuid: location.entityInstanceUuid, uuid: location.uuid, redirect: '../../../locations' }));
        setConfirmDelete(false);
    }, [location, dispatch]);

    const buttons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'pencil',
                disabled: false,
                tooltip: 'Edit',
                onClick: () => {
                    onEditClick();
                },
            },
            {
                icon: 'trash',
                disabled: false,
                tooltip: 'Delete',
                onClick: () => {
                    setConfirmDelete(true);
                },
            },
            {
                icon: 'check',
                disabled: location?.enabled || false,
                tooltip: 'Enable',
                onClick: () => {
                    onEnableClick();
                },
            },
            {
                icon: 'times',
                disabled: !location?.enabled || false,
                tooltip: 'Disable',
                onClick: () => {
                    onDisableClick();
                },
            },
        ],
        [location?.enabled, onDisableClick, onEditClick, onEnableClick],
    );

    const selectedCertificateDetails = useMemo(() => {
        const selectedCert = location?.certificates.find((c) => c.certificateUuid === certCheckedRows[0]);
        return selectedCert;
    }, [location, certCheckedRows]);

    const certButtons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'trash',
                disabled: certCheckedRows.length === 0,
                tooltip: 'Remove',
                onClick: () => {
                    setConfirmRemoveDialog(true);
                },
            },
            {
                icon: 'push',
                disabled: !location?.supportMultipleEntries && (location ? location.certificates.length > 0 : false),
                tooltip: 'Push',
                onClick: () => {
                    setPushDialog(true);
                },
            },
            {
                icon: 'cubes',
                disabled: !location?.supportKeyManagement,
                tooltip: 'Issue',
                onClick: () => {
                    setIssueDialog(true);
                },
            },
            {
                icon: 'retweet',
                disabled: certCheckedRows.length === 0 || selectedCertificateDetails?.state === CertificateState.Requested,
                tooltip: 'Renew',
                onClick: () => {
                    onRenewClick();
                },
            },
            {
                icon: 'repeat',
                disabled: false,
                tooltip: 'Sync',
                onClick: () => {
                    onSyncClick();
                },
            },
        ],
        [certCheckedRows.length, location, onRenewClick, onSyncClick, selectedCertificateDetails?.state],
    );

    const detailHeaders: TableHeader[] = useMemo(() => createWidgetDetailHeaders(), []);

    const detailData: TableDataRow[] = useMemo(
        () =>
            location
                ? [
                      {
                          id: 'uuid',
                          columns: ['UUID', location.uuid],
                      },
                      {
                          id: 'name',
                          columns: ['Name', location.name],
                      },
                      {
                          id: 'description',
                          columns: ['Description', location.description || ''],
                      },
                      {
                          id: 'status',
                          columns: ['Status', <StatusBadge enabled={location.enabled} />],
                      },
                      {
                          id: 'entityUuid',
                          columns: ['Entity UUID', location.entityInstanceUuid],
                      },
                      {
                          id: 'entityName',
                          columns: [
                              'Entity Name',
                              location.entityInstanceUuid ? (
                                  <Link to={`../../entities/detail/${location.entityInstanceUuid}`}>{location.entityInstanceName}</Link>
                              ) : (
                                  ''
                              ),
                          ],
                      },
                  ]
                : [],
        [location],
    );

    const certHeaders: TableHeader[] = useMemo(
        () => [
            {
                id: 'cn',
                content: 'Common Name',
                sortable: true,
                width: '15%',
            },
            {
                id: 'cs',
                content: 'State',
                sortable: true,
                width: '15%',
            },
            {
                id: 'vs',
                content: 'Validation Status',
                sortable: true,
                width: '15%',
            },
            {
                id: 'pk',
                align: 'center',
                content: 'Private Key',
                sortable: true,
                width: '5%',
            },
            {
                id: 'metadata',
                content: 'Metadata',
                width: '40%',
            },
            {
                id: 'CSR Detail',
                content: 'CSR Detail',
                width: '35%',
            },
        ],
        [],
    );

    const certData: TableDataRow[] = useMemo(
        () =>
            location
                ? location.certificates.map((cert) => ({
                      id: cert.certificateUuid,
                      columns: [
                          <>
                              {cert.commonName || 'empty'}
                              <Link
                                  key={cert.certificateUuid}
                                  to={`../../../certificates/detail/${cert.certificateUuid}`}
                                  onClick={(e) => {
                                      e.stopPropagation();
                                  }}
                              >
                                  <Button color="secondary" className="!rounded-full !p-0.5" title="View certificate details">
                                      <ArrowRight size={10} strokeWidth={3} />
                                  </Button>
                              </Link>
                          </>,
                          <CertificateStatusBadge status={cert.state} />,
                          <CertificateStatusBadge status={cert.validationStatus} />,
                          cert.withKey ? <Badge color="success">Yes</Badge> : <Badge color="danger">No</Badge>,

                          !cert.metadata || cert.metadata.length === 0 ? (
                              ''
                          ) : (
                              <div style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: '20em', overflow: 'hidden' }}>
                                  {cert.metadata.map((atr) => atr.connectorName + ' (' + atr.items.length + ')').join(', ')}
                              </div>
                          ),

                          !cert.csrAttributes || cert.csrAttributes.length === 0 ? (
                              ''
                          ) : (
                              <div style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: '20em', overflow: 'hidden' }}>
                                  {cert.csrAttributes.map((atr) => getAttributeContent(atr.contentType, atr.content) ?? '').join(', ')}
                              </div>
                          ),
                      ],

                      detailColumns: [
                          cert.metadata?.length ? (
                              <AttributeViewer viewerType={ATTRIBUTE_VIEWER_TYPE.METADATA_FLAT} metadata={cert.metadata} />
                          ) : (
                              <></>
                          ),
                          cert.csrAttributes?.length ? (
                              <AttributeViewer viewerType={ATTRIBUTE_VIEWER_TYPE.ATTRIBUTE} attributes={cert.csrAttributes} />
                          ) : (
                              <></>
                          ),
                      ],
                  }))
                : [],
        [location],
    );

    if (isFetching) {
        return <DetailPageSkeleton layout="tabs" tabCount={5} />;
    }

    return (
        <div>
            <Breadcrumb
                items={[
                    { label: `${getEnumLabel(resourceEnum, Resource.Locations)} Inventory`, href: '/locations' },
                    { label: location?.name || 'Location Details', href: '' },
                ]}
            />
            <Widget widgetLockName={LockWidgetNameEnum.LocationDetails} busy={isBusy} noBorder>
                <Container>
                    <TabLayout
                        tabs={[
                            {
                                title: 'Details',
                                content: (
                                    <Container>
                                        <Widget
                                            title="Location Properties"
                                            widgetButtons={buttons}
                                            titleSize="large"
                                            refreshAction={getFreshLocationDetails}
                                        >
                                            <CustomTable headers={detailHeaders} data={detailData} />
                                        </Widget>

                                        <Widget
                                            title="Location Certificates"
                                            titleSize="large"
                                            widgetButtons={certButtons}
                                            busy={
                                                isRenewingCertificate ||
                                                isPushingCertificate ||
                                                isRemovingCertificate ||
                                                isSyncing ||
                                                isIssuingCertificate
                                            }
                                        >
                                            <CustomTable
                                                headers={certHeaders}
                                                data={certData}
                                                hasCheckboxes
                                                multiSelect={false}
                                                onCheckedRowsChanged={(rows) => {
                                                    setCertCheckedRows(rows as string[]);
                                                }}
                                                hasDetails
                                            />
                                        </Widget>
                                    </Container>
                                ),
                            },
                            {
                                title: 'Attributes',
                                content: (
                                    <Container>
                                        <Widget title="Location Attributes" titleSize="large">
                                            <AttributeViewer attributes={location?.attributes} />
                                        </Widget>
                                        {location && (
                                            <CustomAttributeWidget
                                                resource={Resource.Locations}
                                                resourceUuid={location.uuid}
                                                attributes={location.customAttributes}
                                            />
                                        )}

                                        <Widget title="Metadata" titleSize="large">
                                            {location?.metadata && (
                                                <AttributeViewer viewerType={ATTRIBUTE_VIEWER_TYPE.METADATA} metadata={location.metadata} />
                                            )}
                                        </Widget>
                                    </Container>
                                ),
                            },
                        ]}
                    />
                </Container>
            </Widget>
            <Dialog
                isOpen={confirmDelete}
                caption="Delete Location"
                body="You are about to delete Location. Is this what you want to do?"
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                buttons={[
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                ]}
            />
            <Dialog
                isOpen={confirmRemoveDialog}
                caption={`Remove ${certCheckedRows.length === 1 ? 'certificate' : 'certificates'} from the location`}
                size="md"
                body={
                    <>
                        You are about to remove certificates from the location:
                        <ul className="list-disc list-inside space-y-2 my-2">
                            {certCheckedRows.map((uuid) => {
                                const cert = location?.certificates.find((c) => c.certificateUuid === uuid);
                                return cert ? <li key={uuid}>{cert.commonName || 'empty'}</li> : null;
                            })}
                        </ul>
                        Is this what you want to do?
                    </>
                }
                toggle={() => setConfirmRemoveDialog(false)}
                buttons={[
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmRemoveDialog(false), body: 'Cancel' },
                    { color: 'danger', onClick: onRemoveConfirmed, body: 'Yes, remove' },
                ]}
            />
            <Dialog
                isOpen={pushDialog}
                caption="Push certificate to the location"
                toggle={() => setPushDialog(false)}
                buttons={[]}
                size="xl"
                body={
                    <div className="space-y-4">
                        <CertificateList
                            selectCertsOnly={true}
                            multiSelect={false}
                            hideWidgetButtons
                            onCheckedRowsChanged={(certs: (string | number)[]) => setSelectedCerts(certs as string[])}
                        />

                        <PushCertificateForm
                            selectedCerts={selectedCerts}
                            location={location}
                            pushAttributeDescriptors={pushAttributeDescriptors || []}
                            pushGroupAttributesCallbackAttributes={pushGroupAttributesCallbackAttributes}
                            setPushGroupAttributesCallbackAttributes={setPushGroupAttributesCallbackAttributes}
                            isPushingCertificate={isPushingCertificate}
                            setPushDialog={setPushDialog}
                        />

                        <Spinner active={isPushingCertificate || isRemovingCertificate} />
                    </div>
                }
            />
            <Dialog
                isOpen={issueDialog}
                caption="Issue certificate for the location"
                toggle={() => setIssueDialog(false)}
                buttons={[]}
                size="xl"
                body={
                    <>
                        <IssueCertificateForm
                            location={location}
                            issuanceAttributeDescriptors={issuanceAttributeDescriptors ?? []}
                            issueGroupAttributesCallbackAttributes={issueGroupAttributesCallbackAttributes}
                            setIssueGroupAttributesCallbackAttributes={setIssueGroupAttributesCallbackAttributes}
                            csrAttributeDescriptors={csrAttributeDescriptors ?? []}
                            csrGroupAttributesCallbackAttributes={csrGroupAttributesCallbackAttributes}
                            setCsrGroupAttributesCallbackAttributes={setCsrGroupAttributesCallbackAttributes}
                            resourceCustomAttributes={resourceCustomAttributes ?? []}
                            raProfiles={raProfiles}
                            isPushingCertificate={isPushingCertificate}
                            setIssueDialog={setIssueDialog}
                        />

                        <Spinner
                            active={isFetchingRaProfiles || isFetchingIssuanceAttributes || isIssuingCertificate || isRemovingCertificate}
                        />
                    </>
                }
            />

            <Dialog
                isOpen={isEditModalOpen}
                toggle={handleCloseEditModal}
                caption="Edit Location"
                size="xl"
                body={
                    <LocationForm
                        locationId={location?.uuid}
                        entityId={location?.entityInstanceUuid}
                        onCancel={handleCloseEditModal}
                        onSuccess={handleCloseEditModal}
                    />
                }
            />
        </div>
    );
}
