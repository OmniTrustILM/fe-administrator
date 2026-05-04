import AttributeViewer, { ATTRIBUTE_VIEWER_TYPE } from 'components/Attributes/AttributeViewer';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import DetailPageSkeleton from 'components/DetailPageSkeleton';
import Dialog from 'components/Dialog';

import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';

import { actions, selectors } from 'ducks/discoveries';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { PlatformEnum, Resource } from 'types/openapi';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router';

import Label from 'components/Label';

import CustomAttributeWidget from 'components/Attributes/CustomAttributeWidget';
import TabLayout from 'components/Layout/TabLayout';
import { actions as rulesActions, selectors as ruleSelectors } from 'ducks/rules';
import { LockWidgetNameEnum } from 'types/user-interface';
import { dateFormatter, durationFormatter } from 'utils/dateUtil';
import DiscoveryStatus from '../DiscoveryStatus';
import DiscoveryCertificates from './DiscoveryCertificates';
import { createWidgetDetailHeaders } from 'utils/widget';
import Breadcrumb from 'components/Breadcrumb';
import Container from 'components/Container';

export default function DiscoveryDetail() {
    const dispatch = useDispatch();

    const { id } = useParams();

    const discovery = useSelector(selectors.discovery);

    const isFetching = useSelector(selectors.isFetchingDetail);
    const isDeleting = useSelector(selectors.isDeleting);

    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
    const eventNameEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.ResourceEvent));
    const triggerHistorySummary = useSelector(ruleSelectors.triggerHistorySummary);
    const isFetchingTriggerSummary = useSelector(ruleSelectors.isFetchingTriggerHistorySummary);
    const isFetchingRuleTriggerHistories = useSelector(ruleSelectors.isFetchingTriggerHistories);

    const isBusy = useMemo(
        () => isFetching || isDeleting || isFetchingRuleTriggerHistories,
        [isFetching, isDeleting, isFetchingRuleTriggerHistories],
    );
    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const resourceTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const triggerTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.TriggerType));

    const getFreshTriggerHistorySummary = useCallback(() => {
        if (!id) return;
        dispatch(rulesActions.getTriggerHistorySummary({ triggerObjectUuid: id }));
    }, [id, dispatch]);

    const getFreshDiscoveryDetails = useCallback(() => {
        if (!id) return;
        dispatch(actions.resetState());
        dispatch(actions.getDiscoveryDetail({ uuid: id }));
        dispatch(rulesActions.getTriggerHistorySummary({ triggerObjectUuid: id }));
    }, [id, dispatch]);

    useEffect(() => {
        getFreshDiscoveryDetails();
    }, [id, getFreshDiscoveryDetails]);

    const onDeleteConfirmed = useCallback(() => {
        if (!discovery) return;

        dispatch(actions.deleteDiscovery({ uuid: discovery.uuid }));
        setConfirmDelete(false);
    }, [discovery, dispatch]);

    const buttons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'trash',
                disabled: false,
                tooltip: 'Delete',
                onClick: () => {
                    setConfirmDelete(true);
                },
            },
        ],
        [],
    );

    const detailHeaders: TableHeader[] = useMemo(() => createWidgetDetailHeaders(), []);

    const detailData: TableDataRow[] = useMemo(
        () =>
            !discovery
                ? []
                : [
                      {
                          id: 'uuid',
                          columns: ['UUID', discovery.uuid],
                      },
                      {
                          id: 'name',
                          columns: ['Name', discovery.name],
                      },
                      {
                          id: 'kind',
                          columns: ['Kind', discovery.kind],
                      },
                      {
                          id: 'discoveryProviderUUID',
                          columns: ['Discovery Provider UUID', discovery.connectorUuid],
                      },
                      {
                          id: 'discoveryProviderName',
                          columns: [
                              'Discovery Provider Name',
                              discovery.connectorUuid ? (
                                  <Link to={`../../connectors/detail/${discovery.connectorUuid}`}>{discovery.connectorName}</Link>
                              ) : (
                                  ''
                              ),
                          ],
                      },
                      {
                          id: 'providerStatus',
                          columns: [
                              'Discovery Provider Status',
                              <DiscoveryStatus key="providerStatus" status={discovery.connectorStatus} />,
                          ],
                      },
                      {
                          id: 'status',
                          columns: ['Status', <DiscoveryStatus status={discovery.status} />],
                      },
                      {
                          id: 'startTime',
                          columns: [
                              'Discovery Start Time',
                              <span style={{ whiteSpace: 'nowrap' }}>{dateFormatter(discovery.startTime)}</span>,
                          ],
                      },
                      {
                          id: 'endTime',
                          columns: [
                              'Discovery End Time',
                              discovery.endTime ? <span style={{ whiteSpace: 'nowrap' }}>{dateFormatter(discovery.endTime)}</span> : '',
                          ],
                      },
                      {
                          id: 'duration',
                          columns: [
                              'Duration',
                              <span key="duration" style={{ whiteSpace: 'nowrap' }}>
                                  {durationFormatter(discovery.startTime, discovery.endTime)}
                              </span>,
                          ],
                      },
                      {
                          id: 'totalCertificatesDiscovered',
                          columns: ['Total Certificates Discovered', discovery.connectorTotalCertificatesDiscovered?.toString() || '0'],
                      },
                      {
                          id: 'totalCertificatesDownloaded',
                          columns: ['Total Certificates Downloaded', discovery.totalCertificatesDiscovered?.toString() || '0'],
                      },
                      {
                          id: 'message',
                          columns: ['Message', discovery.message || ''],
                      },
                  ],
        [discovery],
    );

    if (isFetching) {
        return <DetailPageSkeleton layout="tabs" tabCount={2} />;
    }

    const triggerHeaders: TableHeader[] = [
        {
            id: 'name',
            content: 'Name',
        },
        {
            id: 'triggerType',
            content: 'Trigger Type',
        },
        {
            id: 'ignoreTrigger',
            content: 'Ignore Trigger',
        },
        {
            id: 'eventName',
            content: 'Event Name',
        },
        {
            id: 'resource',
            content: 'Resource',
        },
        {
            id: 'description',
            content: 'Description',
        },
    ];

    const triggerTableData: TableDataRow[] = discovery?.triggers.length
        ? discovery.triggers.map((trigger) => ({
              id: trigger.uuid,
              columns: [
                  <Link to={`../../triggers/detail/${trigger.uuid}`}>{trigger.name}</Link>,
                  getEnumLabel(triggerTypeEnum, trigger.type ?? ''),
                  trigger.ignoreTrigger ? 'Yes' : 'No',
                  getEnumLabel(eventNameEnum, trigger.event ?? ''),
                  getEnumLabel(resourceTypeEnum, trigger.resource ?? ''),
                  trigger.description || '',
              ],
          }))
        : [];

    const triggersSummary: TableDataRow[] = !triggerHistorySummary
        ? []
        : [
              {
                  id: 'objectsEvaluated',
                  columns: ['Number of Objects Evaluated', triggerHistorySummary?.objectsEvaluated.toString() || '0'],
              },
              {
                  id: 'objectsMatched',
                  columns: ['Number of Objects Matched', triggerHistorySummary?.objectsMatched.toString() || '0'],
              },
              {
                  id: 'objectsIgnored',
                  columns: ['Number of Objects Ignored', triggerHistorySummary?.objectsIgnored.toString() || '0'],
              },
          ];

    return (
        <div>
            <Breadcrumb
                items={[
                    { label: `${getEnumLabel(resourceEnum, Resource.Discoveries)} Inventory`, href: '/discoveries' },
                    { label: discovery?.name || 'Discovery Details' },
                ]}
            />
            <Widget widgetLockName={LockWidgetNameEnum.DiscoveryDetails} busy={isBusy} noBorder>
                <TabLayout
                    tabs={[
                        {
                            title: 'Details',
                            content: (
                                <div>
                                    <Container className="md:flex-row items-start">
                                        <Widget
                                            title="Discovery Details"
                                            widgetButtons={buttons}
                                            titleSize="large"
                                            refreshAction={getFreshDiscoveryDetails}
                                            className="w-full md:w-1/2"
                                        >
                                            <CustomTable headers={detailHeaders} data={detailData} />
                                        </Widget>

                                        <Widget title="Metadata" titleSize="large" className="w-full md:w-1/2">
                                            <AttributeViewer viewerType={ATTRIBUTE_VIEWER_TYPE.METADATA} metadata={discovery?.metadata} />
                                        </Widget>
                                    </Container>

                                    <Container marginTop>
                                        <Widget title="Assigned Triggers" titleSize="large">
                                            <CustomTable headers={triggerHeaders} data={triggerTableData} />
                                        </Widget>

                                        {triggerHistorySummary?.associationObjectUuid === id && (
                                            <Widget
                                                title="Triggers summary"
                                                titleSize="large"
                                                busy={isFetchingTriggerSummary}
                                                refreshAction={getFreshTriggerHistorySummary}
                                            >
                                                <CustomTable headers={detailHeaders} data={triggersSummary} />
                                            </Widget>
                                        )}
                                        {discovery?.uuid && (
                                            <DiscoveryCertificates id={discovery.uuid} triggerHistorySummary={triggerHistorySummary} />
                                        )}
                                    </Container>
                                </div>
                            ),
                        },
                        {
                            title: 'Attributes',
                            content: (
                                <Container className="md:flex-row items-start">
                                    <Widget title="Attributes" titleSize="large" className="w-full md:w-1/2">
                                        <br />
                                        <Label>Discovery Attributes</Label>
                                        <AttributeViewer attributes={discovery?.attributes} />
                                    </Widget>
                                    {discovery && (
                                        <CustomAttributeWidget
                                            resource={Resource.Discoveries}
                                            resourceUuid={discovery.uuid}
                                            attributes={discovery.customAttributes}
                                            className="w-full md:w-1/2"
                                        />
                                    )}
                                </Container>
                            ),
                        },
                    ]}
                />
            </Widget>
            <Dialog
                isOpen={confirmDelete}
                caption="Delete Certification Discovery"
                body="You are about to delete this Discovery. Is this what you want to do?"
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                size="md"
                buttons={[
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                ]}
            />
        </div>
    );
}
