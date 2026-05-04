import { Buffer } from 'buffer';
import DetailPageSkeleton from 'components/DetailPageSkeleton';
import AttributeEditor from 'components/Attributes/AttributeEditor';
import AttributeViewer, { ATTRIBUTE_VIEWER_TYPE } from 'components/Attributes/AttributeViewer';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import ProgressButton from 'components/ProgressButton';
import Spinner from 'components/Spinner';
import StatusBadge from 'components/StatusBadge';
import { actions as utilsActuatorActions } from 'ducks/utilsActuator';

import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import { selectors as userSelectors } from 'ducks/users';

import { actions, selectors } from 'ducks/certificates';
import { actions as connectorActions } from 'ducks/connectors';
import { actions as locationActions, selectors as locationSelectors } from 'ducks/locations';
import { selectors as settingSelectors } from 'ducks/settings';
import { EntityType, actions as filterActions, selectors as filterSelectors } from 'ducks/filters';

import {
    CertificateState as CertStatus,
    CertificateFormatEncoding,
    type CertificateSimpleDto,
    CertificateSubjectType,
    FilterConditionOperator,
    FilterFieldSource,
    type SearchFilterRequestDto,
} from '../../../../types/openapi';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router';

import { actions as raProfilesActions, selectors as raProfilesSelectors } from 'ducks/ra-profiles';
import Button from 'components/Button';
import type { AttributeDescriptorModel, AttributeResponseModel } from 'types/attributes';
import { PlatformEnum, Resource } from 'types/openapi';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { collectFormAttributes } from 'utils/attributes/attributes';
import { downloadFile, formatPEM } from 'utils/certificate';

import { dateFormatter } from 'utils/dateUtil';
import CustomAttributeWidget from '../../../Attributes/CustomAttributeWidget';
import TabLayout from '../../../Layout/TabLayout';

import FlowChart, { type CustomNode } from 'components/FlowChart';
import { transformCertificateObjectToNodesAndEdges } from 'ducks/transform/certificates';
import { Info } from 'lucide-react';
import type { Edge } from 'reactflow';
import { LockWidgetNameEnum } from 'types/user-interface';
import { DeviceType, useCopyToClipboard, useDeviceType } from 'utils/common-hooks';
import CertificateStatus from '../CertificateStatus';
import CertificateList from 'components/_pages/certificates/list';
import { capitalize } from 'utils/common-utils';
import ComplianceCheckResultWidget from 'components/_pages/certificates/ComplianceCheckResultWidget/ComplianceCheckResultWidget';
import Badge from 'components/Badge';
import Container from 'components/Container';
import Breadcrumb from 'components/Breadcrumb';
import CertificateDetailsContent from './CertificateDetailsContent';
import CertificateRequestContent from './CertificateRequestContent';
import Label from 'components/Label';

interface LocationPushFormProps {
    onSubmit: (values: any) => void;
    selectLocationsHeaders: TableHeader[];
    selectLocationsData: TableDataRow[];
    selectLocationsCheckedRows: string[];
    setSelectLocationCheckedRows: (rows: string[]) => void;
    locationAttributeDescriptors?: AttributeDescriptorModel[];
    groupAttributesCallbackAttributes: AttributeDescriptorModel[];
    setGroupAttributesCallbackAttributes: React.Dispatch<React.SetStateAction<AttributeDescriptorModel[]>>;
    onCancel: () => void;
    isPushing: boolean;
}

function LocationPushForm({
    onSubmit,
    selectLocationsHeaders,
    selectLocationsData,
    selectLocationsCheckedRows,
    setSelectLocationCheckedRows,
    locationAttributeDescriptors,
    groupAttributesCallbackAttributes,
    setGroupAttributesCallbackAttributes,
    onCancel,
    isPushing,
}: LocationPushFormProps) {
    const methods = useForm({
        mode: 'onTouched',
        defaultValues: {},
    });

    const { control, handleSubmit, formState, trigger } = methods;
    const allFormValues = useWatch({ control });
    const previousIsPushingRef = useRef(isPushing);

    useEffect(() => {
        if (previousIsPushingRef.current !== isPushing) {
            previousIsPushingRef.current = isPushing;
            if (locationAttributeDescriptors) {
                trigger();
            }
        }
    }, [isPushing, locationAttributeDescriptors, trigger]);

    const handleFormSubmit = (values: any) => {
        onSubmit(allFormValues);
    };
    console.log('formState.isValid', formState.isValid);
    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(handleFormSubmit)}>
                <Label htmlFor="locations">Locations</Label>

                <div className="mb-4">
                    <CustomTable
                        hasPagination={false}
                        headers={selectLocationsHeaders}
                        data={selectLocationsData}
                        hasCheckboxes={true}
                        multiSelect={false}
                        onCheckedRowsChanged={(rows) => setSelectLocationCheckedRows(rows as string[])}
                    />
                </div>

                <TabLayout
                    noBorder
                    tabs={[
                        {
                            title: 'Location Attributes',
                            content: locationAttributeDescriptors ? (
                                <AttributeEditor
                                    id="locationAttributes"
                                    attributeDescriptors={locationAttributeDescriptors}
                                    groupAttributesCallbackAttributes={groupAttributesCallbackAttributes}
                                    setGroupAttributesCallbackAttributes={setGroupAttributesCallbackAttributes}
                                />
                            ) : (
                                <></>
                            ),
                        },
                    ]}
                />

                <Container className="flex-row justify-end modal-footer mt-4" gap={4}>
                    <Button variant="outline" onClick={onCancel} disabled={isPushing} type="button">
                        Cancel
                    </Button>
                    <ProgressButton
                        title="Push"
                        inProgressTitle="Pushing..."
                        inProgress={isPushing}
                        disabled={selectLocationsCheckedRows.length === 0 || !formState.isValid}
                    />
                </Container>
            </form>
        </FormProvider>
    );
}

interface ChainDownloadSwitchState {
    isDownloadTriggered: boolean;
    certificateEncoding?: CertificateFormatEncoding;
    isCopyTriggered?: boolean;
}

export default function CertificateDetail() {
    const dispatch = useDispatch();
    const { id } = useParams();

    const copyToClipboard = useCopyToClipboard();
    const certificate = useSelector(selectors.certificateDetail);
    const certificateRelations = useSelector(selectors.certificateRelations);
    const certificateChain = useSelector(selectors.certificateChain);
    const certificateChainDownloadContent = useSelector(selectors.certificateChainDownloadContent);
    const certificateDownloadContent = useSelector(selectors.certificateDownloadContent);

    const users = useSelector(userSelectors.users);
    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const eventHistory = useSelector(selectors.certificateHistory);
    const certLocations = useSelector(selectors.certificateLocations);
    const approvals = useSelector(selectors.approvals);
    const currentFilters = useSelector(filterSelectors.currentFilters(EntityType.CERTIFICATE));

    const validationResult = useSelector(selectors.validationResult);

    const locations = useSelector(locationSelectors.locations);

    const [groupAttributesCallbackAttributes, setGroupAttributesCallbackAttributes] = useState<AttributeDescriptorModel[]>([]);

    const [certificateNodes, setCertificateNodes] = useState<CustomNode[]>([]);
    const [certificateEdges, setCertificateEdges] = useState<Edge[]>([]);
    const [chainDownloadSwitch, setTriggerChainDownload] = useState<ChainDownloadSwitchState>({ isDownloadTriggered: false });
    const [certificateDownloadSwitch, setCertificateDownload] = useState<ChainDownloadSwitchState>({ isDownloadTriggered: false });

    const [isFlowTabOpened, setIsFlowTabOpened] = useState<boolean>(false);
    const raProfileSelected = useSelector(raProfilesSelectors.raProfile);
    const certificateValidationCheck = useSelector(enumSelectors.platformEnum(PlatformEnum.CertificateValidationCheck));
    const isFetchingApprovals = useSelector(selectors.isFetchingApprovals);
    const isFetching = useSelector(selectors.isFetchingDetail);
    const isDeleting = useSelector(selectors.isDeleting);
    const isUpdatingRaProfile = useSelector(selectors.isUpdatingRaProfile);
    const isUpdatingGroup = useSelector(selectors.isUpdatingGroup);
    const isUpdatingOwner = useSelector(selectors.isUpdatingOwner);
    const isFetchingHistory = useSelector(selectors.isFetchingHistory);
    const isFetchingLocations = useSelector(selectors.isFetchingLocations);
    const isRevoking = useSelector(selectors.isRevoking);
    const isRenewing = useSelector(selectors.isRenewing);
    const isRekeying = useSelector(selectors.isRekeying);
    const isFetchingValidationResult = useSelector(selectors.isFetchingValidationResult);
    const isFetchingCertificateChain = useSelector(selectors.isFetchingCertificateChain);
    const isArchiving = useSelector(selectors.isArchiving);

    const isDeassociating = useSelector(selectors.isDeassociating);
    const isAssociating = useSelector(selectors.isAssociating);
    const isFetchingRelations = useSelector(selectors.isFetchingRelations);

    const deviceType = useDeviceType();
    const [currentInfoId, setCurrentInfoId] = useState('');

    const [locationsCheckedRows, setLocationCheckedRows] = useState<string[]>([]);
    const [selectLocationsCheckedRows, setSelectLocationCheckedRows] = useState<string[]>([]);

    const [locationToEntityMap, setLocationToEntityMap] = useState<{ [key: string]: string }>({});

    const locationAttributeDescriptors = useSelector(locationSelectors.pushAttributeDescriptors);

    const [addCertToLocation, setAddCertToLocation] = useState<boolean>(false);
    const [confirmRemove, setConfirmRemove] = useState<boolean>(false);

    const [isAddingRelatedCertificate, setIsAddingRelatedCertificate] = useState<boolean>(false);
    const [selectedCertificate, setSelectedCertificate] = useState<string | undefined>();
    const [confirmDeleteRelatedCertificate, setConfirmDeleteRelatedCertificate] = useState<boolean>(false);
    const [relatedCertificateCheckedRows, setRelatedCertificateCheckedRows] = useState<string[]>([]);
    const [isAlreadyRelatedError, setIsAlreadyRelatedError] = useState<boolean>(false);
    const [selectedAttributesInfo, setSelectedAttributesInfo] = useState<AttributeResponseModel[] | null>(null);
    const relatedCertificatesFiltersSnapshotRef = useRef<typeof currentFilters | null>(null);

    const isRemovingCertificate = useSelector(locationSelectors.isRemovingCertificate);
    const isPushingCertificate = useSelector(locationSelectors.isPushingCertificate);

    const isFetchingLocationPushAttributeDescriptors = useSelector(locationSelectors.isFetchingPushAttributeDescriptors);

    const isBusy = useMemo(
        () =>
            isFetching ||
            isDeleting ||
            isUpdatingGroup ||
            isUpdatingRaProfile ||
            isUpdatingOwner ||
            isRevoking ||
            isRenewing ||
            isRekeying ||
            isFetchingCertificateChain ||
            isFetchingApprovals ||
            isArchiving,
        [
            isFetching,
            isDeleting,
            isUpdatingGroup,
            isUpdatingRaProfile,
            isUpdatingOwner,
            isRevoking,
            isRenewing,
            isRekeying,
            isFetchingCertificateChain,
            isFetchingApprovals,
            isArchiving,
        ],
    );

    const isCertificateArchived = !!certificate?.archived;

    const transformCertificate = useCallback(() => {
        const { nodes, edges } = transformCertificateObjectToNodesAndEdges(
            certificate,
            users,
            certLocations,
            raProfileSelected,
            certificateChain,
        );
        setCertificateNodes(nodes);
        setCertificateEdges(edges);
    }, [certificate, users, certLocations, raProfileSelected, certificateChain]);

    const fileNameToDownload = certificate?.commonName + '_' + certificate?.serialNumber;

    useEffect(() => {
        if (!certificateChainDownloadContent || !chainDownloadSwitch.isDownloadTriggered) return;

        const extensionFormat = chainDownloadSwitch.certificateEncoding === CertificateFormatEncoding.Pem ? '.pem' : '.p7b';
        downloadFile(Buffer.from(certificateChainDownloadContent.content ?? '', 'base64'), fileNameToDownload + '_chain' + extensionFormat);

        setTriggerChainDownload({ isDownloadTriggered: false });
    }, [certificateChainDownloadContent, chainDownloadSwitch, fileNameToDownload]);

    useEffect(() => {
        if (!certificateDownloadContent || !certificateDownloadSwitch.isDownloadTriggered) return;
        if (certificateDownloadSwitch.isCopyTriggered) {
            setCertificateDownload({ isDownloadTriggered: false });
            return;
        }

        const extensionFormat = certificateDownloadSwitch.certificateEncoding === CertificateFormatEncoding.Pem ? '.pem' : '.cer';
        downloadFile(Buffer.from(certificateDownloadContent.content ?? '', 'base64'), fileNameToDownload + extensionFormat);

        setCertificateDownload({ isDownloadTriggered: false });
    }, [certificateDownloadContent, certificateDownloadSwitch, fileNameToDownload]);

    useEffect(() => {
        transformCertificate();
    }, [transformCertificate]);
    const settings = useSelector(settingSelectors.platformSettings);

    const getFreshRaProfileDetail = useCallback(() => {
        if (!id || !certificate?.raProfile?.authorityInstanceUuid) return;
        dispatch(
            raProfilesActions.getRaProfileDetail({
                authorityUuid: certificate.raProfile.authorityInstanceUuid,
                uuid: certificate.raProfile.uuid,
            }),
        );
    }, [id, dispatch, certificate]);

    useEffect(() => {
        if (!id) return;
        getFreshRaProfileDetail();
    }, [dispatch, id, certificate, getFreshRaProfileDetail]);

    useEffect(() => {
        if (!settings?.utils?.utilsServiceUrl) return;
        dispatch(utilsActuatorActions.health());
    }, [dispatch, settings]);

    const getFreshCertificateHistory = useCallback(() => {
        if (!id) return;
        dispatch(actions.getCertificateHistory({ uuid: id }));
    }, [dispatch, id]);

    const getFreshRelatedCertificates = useCallback(() => {
        if (!id || isDeassociating || isAssociating) return;
        setRelatedCertificateCheckedRows([]);
        dispatch(actions.getCertificateRelations({ uuid: id }));
    }, [dispatch, id, isDeassociating, isAssociating]);

    const getFreshCertificateLocations = useCallback(() => {
        if (!id || isPushingCertificate || isRemovingCertificate) return;

        dispatch(actions.listCertificateLocations({ uuid: id }));
        dispatch(locationActions.listLocations({}));
    }, [dispatch, isPushingCertificate, isRemovingCertificate, id]);

    const getFreshApprovalList = useCallback(() => {
        if (!id) return;
        dispatch(actions.listCertificateApprovals({ uuid: id }));
    }, [dispatch, id]);

    const getCertificateChainDetails = useCallback(() => {
        if (!id) return;
        dispatch(actions.getCertificateChain({ uuid: id, withEndCertificate: false }));
    }, [dispatch, id]);

    useEffect(() => {
        if (!id && isFlowTabOpened) return;
        getCertificateChainDetails();
    }, [isFlowTabOpened, id, getCertificateChainDetails]);

    const getFreshCertificateDetail = useCallback(() => {
        if (!id) return;
        dispatch(actions.clearCertificateDetail());
        dispatch(actions.getCertificateDetail({ uuid: id }));
        dispatch(actions.getCertificateHistory({ uuid: id }));
        getFreshRelatedCertificates();
        getFreshApprovalList();
        getFreshCertificateLocations();
    }, [dispatch, id, getFreshApprovalList, getFreshCertificateLocations, getFreshRelatedCertificates]);

    useEffect(() => {
        getFreshCertificateDetail();
    }, [getFreshCertificateDetail, id]);

    const getFreshCertificateValidations = useCallback(() => {
        // TODO: Add toast for no certificate
        if (!certificate) return;
        if (certificate.state === CertStatus.Requested) return;
        dispatch(actions.getCertificateValidationResult({ uuid: certificate.uuid }));
    }, [dispatch, certificate]);

    useEffect(() => {
        getFreshCertificateValidations();
    }, [getFreshCertificateValidations]);

    useEffect(() => {
        if (!certificate || !locations || locations.length === 0) return;

        const locationToEntityMapLocal: { [key: string]: string } = {};

        for (const location of locations) {
            locationToEntityMapLocal[location.uuid] = location.entityInstanceUuid;
        }

        setLocationToEntityMap(locationToEntityMapLocal);
    }, [certificate, locations]);

    useEffect(() => {
        dispatch(connectorActions.clearCallbackData());
        setGroupAttributesCallbackAttributes([]);

        selectLocationsCheckedRows.length === 0
            ? dispatch(locationActions.clearPushAttributeDescriptors())
            : dispatch(
                  locationActions.getPushAttributes({
                      uuid: selectLocationsCheckedRows[0],
                      entityUuid: locationToEntityMap[selectLocationsCheckedRows[0]],
                  }),
              );
    }, [dispatch, locationToEntityMap, selectLocationsCheckedRows]);

    const onAddCertToLocations = useCallback(
        (values: { locationAttributes: Record<string, any> }) => {
            setAddCertToLocation(false);

            if (selectLocationsCheckedRows.length === 0 || !certificate) return;

            dispatch(
                locationActions.pushCertificate({
                    certificateUuid: certificate.uuid,
                    locationUuid: selectLocationsCheckedRows[0],
                    entityUuid: locationToEntityMap[selectLocationsCheckedRows[0]],
                    pushRequest: {
                        attributes: collectFormAttributes(
                            'locationAttributes',
                            [...(locationAttributeDescriptors ?? []), ...groupAttributesCallbackAttributes],
                            values,
                        ),
                    },
                }),
            );
        },
        [
            selectLocationsCheckedRows,
            certificate,
            dispatch,
            locationAttributeDescriptors,
            locationToEntityMap,
            groupAttributesCallbackAttributes,
        ],
    );

    const onRemove = useCallback(() => {
        if (locationsCheckedRows.length === 0 || !certificate) return;

        setConfirmRemove(false);

        locationsCheckedRows.forEach((uuid) => {
            dispatch(
                locationActions.removeCertificate({
                    certificateUuid: certificate.uuid,
                    locationUuid: uuid,
                    entityUuid: locationToEntityMap[uuid],
                }),
            );
        });
    }, [dispatch, certificate, locationsCheckedRows, locationToEntityMap]);

    const buttonsLocations: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'plus',
                disabled: isCertificateArchived,
                tooltip: 'Push to location',
                onClick: () => {
                    setSelectLocationCheckedRows([]);
                    setAddCertToLocation(true);
                },
            },
            {
                icon: 'trash',
                disabled: locationsCheckedRows.length === 0,
                tooltip: 'Remove',
                onClick: () => {
                    setConfirmRemove(true);
                },
            },
        ],
        [locationsCheckedRows.length, isCertificateArchived],
    );

    const historyHeaders: TableHeader[] = useMemo(
        () => [
            {
                id: 'time',
                content: 'Time',
            },
            {
                id: 'user',
                content: 'User',
            },
            {
                id: 'event',
                content: 'Event',
            },
            {
                id: 'status',
                content: 'Status',
            },
            {
                id: 'message',
                content: 'Message',
            },
            {
                id: 'additionalMessage',
                content: 'Additional Message',
            },
        ],
        [],
    );

    const historyEntry: TableDataRow[] = useMemo(
        () =>
            !eventHistory
                ? []
                : eventHistory.map((history) => ({
                      id: history.uuid,
                      columns: [
                          <span style={{ whiteSpace: 'nowrap' }}>{dateFormatter(history.created)}</span>,

                          history.createdBy,

                          history.event,

                          <CertificateStatus status={history.status} />,

                          <div style={{ wordBreak: 'break-all' }}>{history.message}</div>,

                          history.additionalInformation ? (
                              <Button
                                  variant="transparent"
                                  onClick={() => setCurrentInfoId(history.uuid)}
                                  title="Show Additional Information"
                              >
                                  <Info size={16} aria-hidden="true" />
                              </Button>
                          ) : (
                              ''
                          ),
                      ],
                  })),
        [eventHistory],
    );

    const additionalInfoEntry = (): any => {
        const returnList = [];

        if (!currentInfoId) return;

        const currentHistory = eventHistory?.filter((history) => history.uuid === currentInfoId);

        for (const [key, value] of Object.entries(currentHistory![0]?.additionalInformation ?? {})) {
            returnList.push(
                <tr>
                    <td style={{ padding: '0.25em' }}>{key}</td>
                    <td style={{ padding: '0.25em' }}>
                        <p
                            style={{
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all',
                            }}
                        >
                            {JSON.stringify(value)}
                        </p>
                    </td>
                </tr>,
            );
        }

        return returnList;
    };

    const validationHeaders: TableHeader[] = useMemo(
        () => [
            {
                id: 'validationType',
                content: 'Validation check',
            },
            {
                id: 'status',
                content: 'Status',
            },
            {
                id: 'message',
                content: 'Message',
                width: '70%',
            },
        ],
        [],
    );

    const relatedCertificatesHeaders: TableHeader[] = useMemo(
        () => [
            {
                id: 'name',
                content: 'Common Name',
            },
            {
                id: 'relation',
                content: 'Relation',
            },
            { id: 'relationType', content: 'Relation Type' },
            { id: 'state', content: 'State' },
            { id: 'serialNumber', content: 'Serial Number' },
            { id: 'valid', content: 'Valid From' },
            { id: 'expires', content: 'Expires At' },
        ],
        [],
    );

    const validationData: TableDataRow[] = useMemo(() => {
        const validationDataRows =
            !certificate && validationResult?.validationChecks
                ? []
                : [
                      ...Object.entries(validationResult?.validationChecks ?? {}).map(([key, value]) => ({
                          id: key,
                          columns: [
                              getEnumLabel(certificateValidationCheck, key),
                              value?.status ? <CertificateStatus status={value.status} /> : '',
                              <div style={{ wordBreak: 'break-all' }}>
                                  {value.message?.split('\n').map((str: string, i) => (
                                      <div key={i}>
                                          {str}
                                          <br />
                                      </div>
                                  ))}
                              </div>,
                          ],
                      })),
                  ];

        validationDataRows.push({
            id: 'validationStatus',
            columns: [
                <div key="validationStatus">
                    <span className="font-bold">Validation Result</span>{' '}
                    {validationResult?.validationTimestamp ? `(${dateFormatter(validationResult?.validationTimestamp)})` : ''}
                </div>,
                validationResult?.resultStatus ? <CertificateStatus status={validationResult?.resultStatus}></CertificateStatus> : <></>,
                <div key="validationMessage" style={{ wordBreak: 'break-all' }}>
                    {validationResult?.message}
                </div>,
            ],
        });

        return validationDataRows;
    }, [certificate, validationResult, certificateValidationCheck]);

    const setRelatedCertificatesRelation = (relatedCertificates: CertificateSimpleDto[], type: 'predecessor' | 'successor') => {
        const withRelationType = relatedCertificates.map((c) => ({
            ...c,
            relation: type,
        }));
        return withRelationType;
    };

    const relatedCertificates = useMemo(() => {
        if (!certificateRelations) return [];
        return [
            ...setRelatedCertificatesRelation(certificateRelations?.predecessorCertificates ?? [], 'predecessor'),
            ...setRelatedCertificatesRelation(certificateRelations?.successorCertificates ?? [], 'successor'),
        ];
    }, [certificateRelations]);

    const getCertificateIsAlreadyRelated = useCallback(
        (associateId: string | undefined) => {
            if (!relatedCertificates || !associateId) return false;
            return relatedCertificates.some((c) => c.uuid === associateId);
        },
        [relatedCertificates],
    );

    const getRelatedCertificateName = useCallback(
        (uuid: string) => {
            if (!relatedCertificates) return '';
            return relatedCertificates.find((c) => c.uuid === uuid)?.commonName;
        },
        [relatedCertificates],
    );

    const relatedCertificatesData: TableDataRow[] = useMemo(() => {
        if (!relatedCertificates) return [];

        return relatedCertificates.map((c) => ({
            id: `${c.uuid}`,
            columns: [
                <Link key={`${c.uuid}-name`} to={`../../certificates/detail/${c.uuid}`}>
                    {c.commonName}
                </Link>,
                <div key={`${c.uuid}-relation`} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {c.relation === 'successor' && <span>{capitalize(c.relation)}</span>}
                    <i
                        className="fa-solid fa-arrow-right"
                        style={{ transform: c.relation === 'predecessor' ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    ></i>
                    {c.relation === 'predecessor' && <span>{capitalize(c.relation)}</span>}
                </div>,
                <Badge key={`${c.uuid}-type`} color="success">
                    {capitalize(c.relationType)}
                </Badge>,
                <CertificateStatus status={c.state} />,
                c.serialNumber || '',
                c.notBefore ? <span style={{ whiteSpace: 'nowrap' }}>{dateFormatter(c.notBefore)}</span> : '',
                c.notAfter ? <span style={{ whiteSpace: 'nowrap' }}>{dateFormatter(c.notAfter)}</span> : '',
            ],
        }));
    }, [relatedCertificates]);

    const onDeleteRelatedCertificate = useCallback(() => {
        if (relatedCertificateCheckedRows.length === 0 || !id) return;

        dispatch(actions.deassociateCertificate({ uuid: id, certificateUuid: relatedCertificateCheckedRows[0] }));
        setConfirmDeleteRelatedCertificate(false);
        setRelatedCertificateCheckedRows([]);
    }, [relatedCertificateCheckedRows, id, dispatch]);

    const cloneCertificateFilters = useCallback((filters: typeof currentFilters) => {
        return filters.map((filter) => ({
            ...filter,
            value: Array.isArray(filter.value) ? [...filter.value] : filter.value,
        }));
    }, []);

    const setRelatedCertificatesFilters = useCallback(() => {
        let subjectTypeFilter: SearchFilterRequestDto | null = null;

        if (
            certificate?.subjectType === CertificateSubjectType.EndEntity ||
            certificate?.subjectType === CertificateSubjectType.SelfSignedEndEntity
        ) {
            subjectTypeFilter = {
                fieldSource: FilterFieldSource.Property,
                fieldIdentifier: 'SUBJECT_TYPE',
                condition: FilterConditionOperator.Equals,
                value: [CertificateSubjectType.EndEntity, CertificateSubjectType.SelfSignedEndEntity],
            };
        } else if (certificate?.subjectType) {
            subjectTypeFilter = {
                fieldSource: FilterFieldSource.Property,
                fieldIdentifier: 'SUBJECT_TYPE',
                condition: FilterConditionOperator.Equals,
                value: [certificate.subjectType],
            };
        }

        const modalFilters = subjectTypeFilter ? [subjectTypeFilter] : [];

        dispatch(
            filterActions.setCurrentFilters({
                entity: EntityType.CERTIFICATE,
                currentFilters: modalFilters,
            }),
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [certificate?.subjectType]);

    const restoreCertificateListFilters = useCallback(() => {
        const snapshot = relatedCertificatesFiltersSnapshotRef.current;
        if (!snapshot) return;

        dispatch(
            filterActions.setCurrentFilters({
                entity: EntityType.CERTIFICATE,
                currentFilters: snapshot,
            }),
        );

        relatedCertificatesFiltersSnapshotRef.current = null;
    }, [dispatch]);

    const openAddRelatedCertificateDialog = useCallback(() => {
        relatedCertificatesFiltersSnapshotRef.current = cloneCertificateFilters(currentFilters);
        setRelatedCertificatesFilters();
        setRelatedCertificateCheckedRows([]);
        setIsAlreadyRelatedError(false);
        setIsAddingRelatedCertificate(true);
    }, [cloneCertificateFilters, currentFilters, setRelatedCertificatesFilters]);

    const closeAddRelatedCertificateDialog = useCallback(() => {
        setIsAddingRelatedCertificate(false);
        setSelectedCertificate(undefined);
        restoreCertificateListFilters();
    }, [restoreCertificateListFilters]);

    const onCertificateAssociate = useCallback(
        (certificateId: string | undefined, associateId: string | undefined) => {
            if (!certificateId || !associateId) return;
            closeAddRelatedCertificateDialog();
            setIsAlreadyRelatedError(false);
            dispatch(actions.associateCertificate({ uuid: certificateId, certificateUuid: associateId }));
        },
        [dispatch, closeAddRelatedCertificateDialog],
    );

    const relatedCertificatesButtons: WidgetButtonProps[] = useMemo(() => {
        return [
            {
                id: 'add_related_certificate',
                icon: 'plus',
                disabled: isCertificateArchived,
                tooltip: 'Add related certificate',
                onClick: () => {
                    openAddRelatedCertificateDialog();
                },
            },
            {
                id: 'remove_related_certificate',
                icon: 'trash',
                disabled: relatedCertificateCheckedRows.length === 0,
                tooltip: 'Remove',
                onClick: () => {
                    setConfirmDeleteRelatedCertificate(true);
                },
            },
        ];
    }, [isCertificateArchived, relatedCertificateCheckedRows.length, openAddRelatedCertificateDialog]);

    useEffect(() => {
        if (!selectedCertificate) {
            setIsAlreadyRelatedError(false);
        }
        const isAlreadyRelated = getCertificateIsAlreadyRelated(selectedCertificate);

        setIsAlreadyRelatedError(isAlreadyRelated);
    }, [selectedCertificate, getCertificateIsAlreadyRelated]);

    useEffect(() => {
        return () => {
            const snapshot = relatedCertificatesFiltersSnapshotRef.current;
            if (!snapshot) return;

            dispatch(
                filterActions.setCurrentFilters({
                    entity: EntityType.CERTIFICATE,
                    currentFilters: snapshot,
                }),
            );

            relatedCertificatesFiltersSnapshotRef.current = null;
        };
    }, [dispatch]);

    const locationsHeaders: TableHeader[] = useMemo(
        () => [
            {
                content: 'Name',
                sortable: true,
                sort: 'asc',
                id: 'locationName',
                width: 'auto',
            },
            {
                content: 'Description',
                sortable: true,
                id: 'locationDescription',
                width: 'auto',
            },
            {
                content: 'Entity',
                sortable: true,
                id: 'locationEntity',
                width: 'auto',
            },
            {
                content: 'Multiple Entries',
                align: 'center',
                sortable: true,
                id: 'multiEntries',
                width: 'auto',
            },
            {
                content: 'Key Management',
                align: 'center',
                sortable: true,
                id: 'keyMgmt',
                width: 'auto',
            },
            {
                content: 'State',
                align: 'center',
                sortable: true,
                id: 'state',
                width: '15%',
            },
            {
                content: 'Validation Status',
                align: 'center',
                sortable: true,
                id: 'validationStatus',
                width: '15%',
            },
        ],
        [],
    );

    const locationsData: TableDataRow[] = useMemo(
        () =>
            !certLocations
                ? []
                : certLocations.map((location) => ({
                      id: location.uuid,

                      columns: [
                          <Link to={`../../locations/detail/${location.entityInstanceUuid}/${location.uuid}`}>{location.name}</Link>,

                          location.description || '',

                          <Badge color="primary">{location.entityInstanceName}</Badge>,

                          location.supportMultipleEntries ? <Badge color="success">Yes</Badge> : <Badge color="danger">No</Badge>,

                          location.supportKeyManagement ? <Badge color="success">Yes</Badge> : <Badge color="danger">No</Badge>,

                          certificate?.state ? <CertificateStatus status={certificate?.state} /> : '',

                          certificate?.validationStatus ? <CertificateStatus status={certificate?.validationStatus} /> : '',
                      ],
                  })),
        [certLocations, certificate?.state, certificate?.validationStatus],
    );

    const selectLocationsHeaders: TableHeader[] = useMemo(
        () => [
            {
                content: 'Name',
                sortable: true,
                sort: 'asc',
                id: 'locationName',
                width: 'auto',
            },
            {
                content: 'Description',
                sortable: true,
                id: 'locationDescription',
                width: 'auto',
            },
            {
                content: 'Entity',
                sortable: true,
                id: 'locationEntity',
                width: 'auto',
            },
            {
                content: 'Multiple Entries',
                align: 'center',
                sortable: true,
                id: 'multiEntries',
                width: 'auto',
            },
            {
                content: 'Key Management',
                align: 'center',
                sortable: true,
                id: 'keyMgmt',
                width: 'auto',
            },
            {
                content: 'Status',
                align: 'center',
                sortable: true,
                id: 'Status',
                width: '15%',
            },
        ],
        [],
    );

    const selectLocationsData: TableDataRow[] = useMemo(
        () =>
            !locations
                ? []
                : (locations
                      .map((location) => {
                          if (certLocations?.find((cl) => cl.uuid === location.uuid)) return undefined;

                          return {
                              id: location.uuid,

                              columns: [
                                  location.name,

                                  location.description || '',

                                  <Badge color="primary">{location.entityInstanceName}</Badge>,

                                  location.supportMultipleEntries ? <Badge color="success">Yes</Badge> : <Badge color="danger">No</Badge>,

                                  location.supportKeyManagement ? <Badge color="success">Yes</Badge> : <Badge color="danger">No</Badge>,

                                  <StatusBadge enabled={location.enabled} />,
                              ],
                          };
                      })
                      .filter((location) => location !== undefined) as TableDataRow[]),
        [certLocations, locations],
    );

    const approvalsHeader: TableHeader[] = useMemo(
        () => [
            {
                id: 'approvalUUID',
                content: 'Approval UUID ',
                sort: 'asc',
            },
            {
                id: 'approvalProfile',
                content: 'Approval Profile',
            },
            {
                id: 'status',
                content: 'Status',
            },
            {
                id: 'requestedBy',
                content: 'Requested By',
            },
            {
                id: 'resource',
                content: 'Resource',
            },

            {
                id: 'action',
                content: 'Action',
            },

            {
                id: 'createdAt',
                content: 'Created At',
            },

            {
                id: 'closedAt',
                content: 'Closed At',
            },
        ],
        [],
    );

    const approvalsTableData: TableDataRow[] = useMemo(() => {
        const data = approvals || [];

        return data.map((approval) => ({
            id: approval.approvalUuid,
            columns: [
                <Link to={`../../../approvals/detail/${approval.approvalUuid}`}>{approval.approvalUuid}</Link>,
                <Link to={`../../../approvalprofiles/detail/${approval.approvalProfileUuid}`}>{approval.approvalProfileName}</Link>,
                (
                    <>
                        <StatusBadge textStatus={approval.status} />
                    </>
                ) || '',
                approval.creatorUsername || '',
                approval.resource || '',
                approval.resourceAction || '',
                approval.createdAt ? dateFormatter(approval.createdAt) : '',
                approval.closedAt ? dateFormatter(approval.closedAt) : '',
            ],
        }));
    }, [approvals]);

    const defaultViewport = useMemo(
        () => ({
            zoom: 0.5,
            x: deviceType === DeviceType.Tablet ? -50 : deviceType === DeviceType.Mobile ? -150 : 300,
            y: 0,
        }),
        [deviceType],
    );

    if (isFetching) {
        return <DetailPageSkeleton layout="tabs" tabCount={9} />;
    }

    return (
        <div>
            <Breadcrumb
                items={[
                    { label: `${getEnumLabel(resourceEnum, Resource.Certificates)} Inventory`, href: '/certificates' },
                    { label: certificate?.commonName || 'Certificate Details' },
                ]}
            />
            <Widget widgetLockName={LockWidgetNameEnum.CertificateDetailsWidget} busy={isBusy} noBorder>
                <TabLayout
                    tabs={[
                        {
                            title: 'Details',
                            content: (
                                <CertificateDetailsContent
                                    certificate={certificate}
                                    validationResult={validationResult}
                                    isBusy={isBusy}
                                    getFreshCertificateDetail={getFreshCertificateDetail}
                                />
                            ),
                        },
                        {
                            title: 'Request',
                            hidden: !certificate?.certificateRequest?.content,
                            content: (
                                <CertificateRequestContent
                                    certificate={certificate}
                                    isBusy={isBusy}
                                    getFreshCertificateDetail={getFreshCertificateDetail}
                                    setSelectedAttributesInfo={setSelectedAttributesInfo}
                                />
                            ),
                        },
                        {
                            title: 'Attributes',
                            content: (
                                <Container>
                                    <Widget title="Metadata" titleSize="large">
                                        <AttributeViewer viewerType={ATTRIBUTE_VIEWER_TYPE.METADATA} metadata={certificate?.metadata} />
                                    </Widget>

                                    {certificate?.certificateRequest?.attributes && certificate.certificateRequest.attributes.length > 0 ? (
                                        <Widget title="CSR" titleSize="large">
                                            <AttributeViewer attributes={certificate.certificateRequest.attributes} />
                                        </Widget>
                                    ) : null}

                                    {certificate?.issueAttributes && certificate.issueAttributes.length > 0 ? (
                                        <Widget title="Issue Attributes" titleSize="large">
                                            <AttributeViewer attributes={certificate.issueAttributes} />
                                        </Widget>
                                    ) : null}

                                    {certificate?.revokeAttributes && certificate.revokeAttributes.length > 0 ? (
                                        <Widget title="Revoke Attributes" titleSize="large">
                                            <AttributeViewer attributes={certificate.revokeAttributes} />
                                        </Widget>
                                    ) : null}

                                    {certificate && (
                                        <CustomAttributeWidget
                                            resource={Resource.Certificates}
                                            resourceUuid={certificate.uuid}
                                            attributes={certificate.customAttributes}
                                        />
                                    )}
                                </Container>
                            ),
                        },
                        {
                            title: 'Validation',
                            hidden: !certificate?.certificateContent,
                            content: (
                                <Container>
                                    <Widget
                                        title="Validation Status"
                                        busy={isFetchingValidationResult}
                                        titleSize="large"
                                        refreshAction={certificate && getFreshCertificateValidations}
                                    >
                                        <CustomTable headers={validationHeaders} data={validationData} />
                                    </Widget>
                                    <ComplianceCheckResultWidget
                                        resource={Resource.Certificates}
                                        widgetLockName={LockWidgetNameEnum.CertificateDetailsWidget}
                                        objectUuid={certificate?.uuid ?? ''}
                                        setSelectedAttributesInfo={setSelectedAttributesInfo}
                                    />
                                </Container>
                            ),
                        },
                        {
                            title: 'Approvals',
                            content: (
                                <Widget
                                    title="Certificate Approvals"
                                    busy={isFetchingApprovals}
                                    titleSize="large"
                                    refreshAction={getFreshApprovalList}
                                >
                                    <CustomTable headers={approvalsHeader} data={approvalsTableData} />
                                </Widget>
                            ),
                        },
                        {
                            title: 'Locations',
                            content: (
                                <Widget
                                    title="Certificate Locations"
                                    busy={isFetchingLocations || isRemovingCertificate || isPushingCertificate}
                                    widgetButtons={buttonsLocations}
                                    titleSize="large"
                                    refreshAction={getFreshCertificateLocations}
                                    widgetLockName={LockWidgetNameEnum.CertificationLocations}
                                >
                                    <CustomTable
                                        headers={locationsHeaders}
                                        data={locationsData}
                                        hasCheckboxes
                                        onCheckedRowsChanged={(rows) => setLocationCheckedRows(rows as string[])}
                                    />
                                </Widget>
                            ),
                        },
                        {
                            title: 'History',
                            content: (
                                <Widget
                                    title="Event History"
                                    busy={isFetchingHistory}
                                    titleSize="large"
                                    refreshAction={getFreshCertificateHistory}
                                    widgetLockName={LockWidgetNameEnum.CertificateEventHistory}
                                >
                                    <CustomTable headers={historyHeaders} data={historyEntry} hasPagination={true} />
                                </Widget>
                            ),
                        },
                        {
                            title: 'Flow',
                            onClick: () => {
                                setIsFlowTabOpened(true);
                                getCertificateChainDetails();
                            },
                            content: certificateNodes.length ? (
                                <FlowChart
                                    busy={isBusy}
                                    flowChartTitle="Certificate Flow"
                                    flowChartEdges={certificateEdges}
                                    flowChartNodes={certificateNodes}
                                    defaultViewport={defaultViewport}
                                    flowDirection="TB"
                                />
                            ) : (
                                // Todo: Add a placeholder for the flow chart
                                <></>
                            ),
                        },
                        {
                            title: 'Related Certificates',
                            content: (
                                <Widget
                                    title="Related Certificates"
                                    busy={isDeassociating || isAssociating || isFetchingRelations}
                                    titleSize="large"
                                    widgetButtons={relatedCertificatesButtons}
                                    refreshAction={getFreshRelatedCertificates}
                                >
                                    <CustomTable
                                        headers={relatedCertificatesHeaders}
                                        data={relatedCertificatesData}
                                        hasCheckboxes={true}
                                        hasPagination={true}
                                        onCheckedRowsChanged={(rows) => setRelatedCertificateCheckedRows(rows as string[])}
                                        multiSelect={false}
                                    />
                                </Widget>
                            ),
                        },
                    ]}
                />
            </Widget>

            <Dialog
                isOpen={currentInfoId !== ''}
                caption={`Additional Information`}
                body={additionalInfoEntry()}
                toggle={() => setCurrentInfoId('')}
                buttons={[]}
                size="lg"
            />

            <Dialog
                isOpen={!!selectedAttributesInfo}
                caption="Attributes Info"
                body={<AttributeViewer attributes={selectedAttributesInfo ?? []} />}
                toggle={() => setSelectedAttributesInfo(null)}
                buttons={[]}
            />

            <Dialog
                size="xl"
                isOpen={isAddingRelatedCertificate}
                caption={`Add Related Certificate`}
                toggle={closeAddRelatedCertificateDialog}
                buttons={[]}
                body={
                    <>
                        <CertificateList
                            hideAdditionalButtons={true}
                            hideWidgetButtons={true}
                            multiSelect={false}
                            isLinkDisabled={true}
                            onCheckedRowsChanged={(rows) => {
                                setSelectedCertificate(rows[0] as string);
                            }}
                            withPreservedFilters={false}
                        />
                        <Container className="flex-row justify-end modal-footer" gap={4}>
                            <ProgressButton
                                title="Add"
                                inProgressTitle="Adding..."
                                inProgress={false}
                                disabled={!selectedCertificate || isAlreadyRelatedError}
                                type="button"
                                onClick={() => {
                                    if (selectedCertificate) {
                                        onCertificateAssociate(id, selectedCertificate);
                                    }
                                }}
                            />

                            <Button variant="outline" color="secondary" onClick={closeAddRelatedCertificateDialog} type="button">
                                Cancel
                            </Button>
                        </Container>
                        {isAlreadyRelatedError ? <span className="text-red-600">Certificate is already related</span> : null}
                    </>
                }
            />

            <Dialog
                isOpen={confirmDeleteRelatedCertificate}
                caption="Delete Related Certificate"
                body={
                    <>
                        You are about to delete a{' '}
                        <span style={{ fontWeight: 'bold' }}>{getRelatedCertificateName(relatedCertificateCheckedRows[0] ?? '')} </span>
                        Related Certificate.
                        <br />
                        <br />
                        Is this what you want to do?
                    </>
                }
                toggle={() => setConfirmDeleteRelatedCertificate(false)}
                icon="delete"
                buttons={[
                    { color: 'danger', onClick: () => onDeleteRelatedCertificate(), body: 'Delete' },
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDeleteRelatedCertificate(false), body: 'Cancel' },
                ]}
            />

            <Dialog
                size="xl"
                isOpen={addCertToLocation}
                caption={`Push certificate to the Location`}
                toggle={() => setAddCertToLocation(false)}
                buttons={[]}
                body={
                    <>
                        <LocationPushForm
                            onSubmit={onAddCertToLocations}
                            selectLocationsHeaders={selectLocationsHeaders}
                            selectLocationsData={selectLocationsData}
                            selectLocationsCheckedRows={selectLocationsCheckedRows}
                            setSelectLocationCheckedRows={setSelectLocationCheckedRows}
                            locationAttributeDescriptors={locationAttributeDescriptors}
                            groupAttributesCallbackAttributes={groupAttributesCallbackAttributes}
                            setGroupAttributesCallbackAttributes={setGroupAttributesCallbackAttributes}
                            onCancel={() => setAddCertToLocation(false)}
                            isPushing={isPushingCertificate || isFetchingLocationPushAttributeDescriptors}
                        />

                        <Spinner active={isPushingCertificate || isFetchingLocationPushAttributeDescriptors} />
                    </>
                }
            />

            <Dialog
                isOpen={confirmRemove}
                caption={`Remove Certificate from Location`}
                body={
                    <>
                        You are about to remove a Certificate from selected locations:
                        <br />
                        <br />
                        {locationsCheckedRows.map((uuid) => {
                            const loc = certLocations?.find((l) => l.uuid === uuid);
                            return loc ? (
                                <>
                                    {loc.name}
                                    <br />
                                </>
                            ) : (
                                <></>
                            );
                        })}
                        <br />
                        Is this what you want to do?
                    </>
                }
                toggle={() => setConfirmRemove(false)}
                buttons={[
                    { color: 'primary', onClick: onRemove, body: 'Remove' },
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmRemove(false), body: 'Cancel' },
                ]}
            />
        </div>
    );
}
