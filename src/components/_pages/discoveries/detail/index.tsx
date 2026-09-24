import AttributeViewer, { ATTRIBUTE_VIEWER_TYPE } from 'components/Attributes/AttributeViewer';
import Badge from 'components/Badge';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import DetailPageSkeleton from 'components/DetailPageSkeleton';
import Dialog from 'components/Dialog';

import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';

import { actions, selectors } from 'ducks/discoveries';
import { EnumColumnDescription } from 'components/EnumDescription';
import { selectors as authSelectors } from 'ducks/auth';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { DiscoveryMessageSeverity, PlatformEnum, Resource, ResourceAction } from 'types/openapi';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router';
import ConnectorLink from 'components/ConnectorLink';

import Label from 'components/Label';

import CustomAttributeWidget from 'components/Attributes/CustomAttributeWidget';
import TabLayout from 'components/Layout/TabLayout';
import { actions as rulesActions, selectors as ruleSelectors } from 'ducks/rules';
import { LockWidgetNameEnum } from 'types/user-interface';
import { dateFormatter, durationFormatter } from 'utils/dateUtil';
import { hasResourceAction } from 'utils/permissions';
import DiscoveryStatus from '../DiscoveryStatus';
import DiscoveryProgressWidget from './DiscoveryProgressWidget';
import DiscoveryResults from './DiscoveryResults';
import DiscoveryResultsSummary from './DiscoveryResultsSummary';
import DiscoveryRunMessages from './DiscoveryRunMessages';
import {
    connectorInterfaceLabel,
    deleteTooltip,
    type DiscoveryLifecycleAction,
    isTerminalRun,
    resultResources,
    visibleLifecycleActions,
} from './discoveryDetailHelpers';
import ObjectEventHistoryWidget from 'components/_pages/notifications/events-settings/ObjectEventHistoryWidget';
import { createWidgetDetailHeaders } from 'utils/widget';
import Breadcrumb from 'components/Breadcrumb';
import Container from 'components/Container';
import CommentPanel from 'components/CommentPanel';

const LIFECYCLE_PERMISSION: Record<DiscoveryLifecycleAction, ResourceAction> = {
    stop: ResourceAction.Stop,
    resume: ResourceAction.Resume,
    cancel: ResourceAction.Cancel,
};

export default function DiscoveryDetail() {
    const dispatch = useDispatch();

    const { id } = useParams();

    const discovery = useSelector(selectors.discovery);
    const discoveryMessages = useSelector(selectors.discoveryMessages);
    const profile = useSelector(authSelectors.profile);

    const isFetching = useSelector(selectors.isFetchingDetail);
    const isDeleting = useSelector(selectors.isDeleting);
    const isStopping = useSelector(selectors.isStopping);
    const isResuming = useSelector(selectors.isResuming);
    const isCancelling = useSelector(selectors.isCancelling);

    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
    const [confirmCancel, setConfirmCancel] = useState<boolean>(false);
    const eventNameEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.ResourceEvent));
    const triggerHistorySummary = useSelector(ruleSelectors.triggerHistorySummary);
    const isFetchingTriggerSummary = useSelector(ruleSelectors.isFetchingTriggerHistorySummary);
    const isFetchingRuleTriggerHistories = useSelector(ruleSelectors.isFetchingTriggerHistories);

    const isChangingLifecycle = isStopping || isResuming || isCancelling;
    // One mutation at a time: a delete racing a stop, or a stop racing a delete, would hand the server two contradictory
    // orders and then refresh a run that may no longer exist.
    const isMutating = isDeleting || isChangingLifecycle;

    const isBusy = useMemo(
        () => isFetching || isDeleting || isFetchingRuleTriggerHistories || isChangingLifecycle,
        [isFetching, isDeleting, isFetchingRuleTriggerHistories, isChangingLifecycle],
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

    // What a refresh button does: re-read the run that is already on screen and leave it standing, as the lifecycle
    // epic does. Resetting first would blank the page and show the full skeleton for a re-read of one widget.
    const refreshDiscoveryDetails = useCallback(() => {
        if (!id) return;
        dispatch(actions.getDiscoveryDetail({ uuid: id, keepCurrent: true }));
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

    const onCancelConfirmed = useCallback(() => {
        if (!discovery) return;

        dispatch(actions.cancelDiscovery({ uuid: discovery.uuid }));
        setConfirmCancel(false);
    }, [discovery, dispatch]);

    // stoppable × status × permission. A missing permission hides the control rather than disabling it, and a v1 run
    // is never stoppable, so its header carries exactly the delete button it always did.
    const buttons: WidgetButtonProps[] = useMemo(() => {
        const lifecycleButtons: Record<DiscoveryLifecycleAction, (uuid: string) => WidgetButtonProps> = {
            stop: (uuid) => ({
                icon: 'pause',
                disabled: isMutating,
                tooltip: 'Stop',
                onClick: () => dispatch(actions.stopDiscovery({ uuid })),
            }),
            resume: (uuid) => ({
                icon: 'play',
                disabled: isMutating,
                tooltip: 'Resume',
                onClick: () => dispatch(actions.resumeDiscovery({ uuid })),
            }),
            cancel: () => ({
                icon: 'cancel',
                disabled: isMutating,
                tooltip: 'Cancel',
                onClick: () => setConfirmCancel(true),
            }),
        };
        const lifecycle: WidgetButtonProps[] = discovery
            ? visibleLifecycleActions(discovery, (action) =>
                  hasResourceAction(profile, Resource.Discoveries, LIFECYCLE_PERMISSION[action]),
              ).map((action) => lifecycleButtons[action](discovery.uuid))
            : [];

        // Core refuses to delete a v2 run that has not ended, so the button says so rather than offering a call that
        // fails. A v1 run has no such rule and keeps its delete as it always did.
        const deletable = !discovery?.connectorInterface || isTerminalRun(discovery.status);
        return [
            ...lifecycle,
            {
                icon: 'trash',
                disabled: isMutating || !deletable,
                tooltip: deleteTooltip(discovery?.status, deletable),
                onClick: () => {
                    setConfirmDelete(true);
                },
            },
        ];
    }, [discovery, profile, isMutating, dispatch]);

    const detailHeaders: TableHeader[] = useMemo(() => createWidgetDetailHeaders(), []);

    const detailData: TableDataRow[] = useMemo(
        () =>
            discovery
                ? [
                      {
                          id: 'uuid',
                          columns: ['UUID', discovery.uuid],
                      },
                      {
                          id: 'name',
                          columns: ['Name', discovery.name],
                      },
                      // A v2 run has no kind; its generation shows on the Connector Interface row instead.
                      ...(discovery.connectorInterface
                          ? []
                          : [
                                {
                                    id: 'kind',
                                    columns: ['Kind', discovery.kind ?? ''],
                                },
                            ]),
                      {
                          id: 'discoveryProviderUUID',
                          columns: ['Discovery Provider UUID', discovery.connectorUuid],
                      },
                      {
                          id: 'discoveryProviderName',
                          columns: [
                              'Discovery Provider Name',
                              <ConnectorLink key="connector" uuid={discovery.connectorUuid} name={discovery.connectorName} />,
                          ],
                      },
                      ...(discovery.connectorInterface
                          ? [
                                {
                                    id: 'connectorInterface',
                                    columns: ['Connector Interface', connectorInterfaceLabel(discovery.connectorInterface)],
                                },
                            ]
                          : []),
                      {
                          id: 'resources',
                          columns: [
                              'Resources',
                              <span key="resources" className="inline-flex flex-wrap gap-1">
                                  {resultResources(discovery.resources).map((resource) => (
                                      <Badge key={resource} color="gray">
                                          {getEnumLabel(resourceEnum, resource)}
                                      </Badge>
                                  ))}
                              </span>,
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
                          columns: ['Status', <DiscoveryStatus key="status" status={discovery.status} />],
                      },
                      {
                          id: 'startTime',
                          columns: [
                              'Discovery Start Time',
                              <span key="startTime" style={{ whiteSpace: 'nowrap' }}>
                                  {dateFormatter(discovery.startTime)}
                              </span>,
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
                          id: 'message',
                          columns: ['Message', discovery.message || ''],
                      },
                  ]
                : [],
        [discovery, resourceEnum],
    );

    // Neutral unless the log is known to hold an error; the log is fetched only on its own tab, never with the detail.
    const runMessagesTitle = useMemo(() => {
        const hasError = discoveryMessages?.items.some((message) => message.severity === DiscoveryMessageSeverity.Error) ?? false;
        return (
            <span className="inline-flex items-center gap-2">
                Messages
                <Badge color={hasError ? 'danger' : 'secondary'} dataTestId="run-message-count">
                    {discovery?.runMessageCount ?? 0}
                </Badge>
            </span>
        );
    }, [discovery?.runMessageCount, discoveryMessages]);

    // Only the first load gets the skeleton; a refresh keeps the page and lets the widgets show busy.
    if (isFetching && !discovery) {
        return <DetailPageSkeleton layout="tabs" tabCount={6} />;
    }

    const triggerHeaders: TableHeader[] = [
        {
            id: 'name',
            content: 'Name',
        },
        {
            id: 'triggerType',
            content: (
                <span className="inline-flex items-center gap-1">
                    Trigger Type
                    <EnumColumnDescription platformEnum={PlatformEnum.TriggerType} title="Trigger Type" />
                </span>
            ),
        },
        {
            id: 'ignoreTrigger',
            content: 'Ignore Trigger',
        },
        {
            id: 'eventName',
            content: (
                <span className="inline-flex items-center gap-1">
                    Event Name
                    <EnumColumnDescription platformEnum={PlatformEnum.ResourceEvent} title="Event Name" />
                </span>
            ),
        },
        {
            id: 'resource',
            content: (
                <span className="inline-flex items-center gap-1">
                    Resource
                    <EnumColumnDescription platformEnum={PlatformEnum.Resource} title="Resource" />
                </span>
            ),
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
                  <Link key="name" to={`../../triggers/detail/${trigger.uuid}`}>
                      {trigger.name}
                  </Link>,
                  getEnumLabel(triggerTypeEnum, trigger.type ?? ''),
                  trigger.ignoreTrigger ? 'Yes' : 'No',
                  getEnumLabel(eventNameEnum, trigger.event ?? ''),
                  getEnumLabel(resourceTypeEnum, trigger.resource ?? ''),
                  trigger.description || '',
              ],
          }))
        : [];

    const triggersSummary: TableDataRow[] = triggerHistorySummary
        ? [
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
          ]
        : [];

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
                    tabUrlParam="tab"
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
                                            refreshAction={refreshDiscoveryDetails}
                                            className="w-full md:w-1/2"
                                        >
                                            <CustomTable headers={detailHeaders} data={detailData} />
                                        </Widget>

                                        <Widget title="Metadata" titleSize="large" className="w-full md:w-1/2">
                                            {discovery?.connectorInterface && !discovery.metadata?.length ? (
                                                <p className="mb-2 text-sm text-content-muted" data-testid="no-run-metadata">
                                                    The Discovery Provider has reported no metadata about this run. Its counters are under
                                                    Progress.
                                                </p>
                                            ) : null}
                                            <AttributeViewer viewerType={ATTRIBUTE_VIEWER_TYPE.METADATA} metadata={discovery?.metadata} />
                                        </Widget>
                                    </Container>

                                    {discovery && (
                                        <Container marginTop className="md:flex-row items-start">
                                            <DiscoveryProgressWidget
                                                discovery={discovery}
                                                onRefresh={refreshDiscoveryDetails}
                                                className="w-full md:flex-1"
                                            />
                                            <DiscoveryResultsSummary
                                                discovery={discovery}
                                                headers={detailHeaders}
                                                className="w-full md:flex-1"
                                            />
                                        </Container>
                                    )}

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
                                    </Container>
                                </div>
                            ),
                        },
                        {
                            tabKey: 'results',
                            title: 'Results',
                            content: discovery ? (
                                <DiscoveryResults discovery={discovery} triggerHistorySummary={triggerHistorySummary} />
                            ) : null,
                        },
                        {
                            tabKey: 'messages',
                            title: runMessagesTitle,
                            content: discovery ? (
                                <Container>
                                    <DiscoveryRunMessages discoveryUuid={discovery.uuid} />
                                </Container>
                            ) : null,
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
                        {
                            title: 'Event History',
                            content: discovery ? (
                                <Container>
                                    <ObjectEventHistoryWidget resource={Resource.Discoveries} uuid={discovery.uuid} />
                                </Container>
                            ) : null,
                        },
                        {
                            title: 'Comments',
                            content: discovery ? (
                                <Container>
                                    <CommentPanel resource={Resource.Discoveries} objectUuid={discovery.uuid} />
                                </Container>
                            ) : null,
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
            <Dialog
                isOpen={confirmCancel}
                caption="Cancel Discovery"
                body="Cancelling tells the Discovery Provider to stop and discards this run's work: whatever it has collected stays staged, is never imported into the inventory, and no triggers run on it. This cannot be undone."
                toggle={() => setConfirmCancel(false)}
                icon="warning"
                size="md"
                dataTestId="cancel-discovery-dialog"
                buttons={[
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmCancel(false), body: 'Keep running' },
                    { color: 'danger', onClick: onCancelConfirmed, body: 'Cancel discovery' },
                ]}
            />
        </div>
    );
}
