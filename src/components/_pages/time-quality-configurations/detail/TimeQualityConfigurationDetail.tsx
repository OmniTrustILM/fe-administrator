import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useParams } from 'react-router';

import Breadcrumb from 'components/Breadcrumb';
import Container from 'components/Container';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import CustomAttributeWidget from 'components/Attributes/CustomAttributeWidget';
import StatusBadge from 'components/StatusBadge';

import { actions, selectors } from 'ducks/time-quality-configurations';
import { Resource } from 'types/openapi';
import { LockWidgetNameEnum } from 'types/user-interface';
import { createWidgetDetailHeaders } from 'utils/widget';
import { getInputStringFromIso8601String } from 'utils/duration';

export const TimeQualityConfigurationDetail = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { id } = useParams();

    const timeQualityConfiguration = useSelector(selectors.timeQualityConfiguration);
    const isFetchingDetail = useSelector(selectors.isFetchingDetail);
    const isDeleting = useSelector(selectors.isDeleting);
    const deleteErrorMessage = useSelector(selectors.deleteErrorMessage);
    const associatedSigningProfiles = useSelector(selectors.associatedSigningProfiles);
    const isFetchingAssociatedSigningProfiles = useSelector(selectors.isFetchingAssociatedSigningProfiles);

    const [confirmDelete, setConfirmDelete] = useState<boolean>(false);

    const isBusy = useMemo(() => isFetchingDetail || isDeleting, [isFetchingDetail, isDeleting]);

    const getFreshData = useCallback(() => {
        if (!id) return;
        dispatch(actions.getTimeQualityConfiguration({ uuid: id }));
        dispatch(actions.listAssociatedSigningProfiles({ uuid: id }));
    }, [dispatch, id]);

    useEffect(() => {
        getFreshData();
    }, [getFreshData]);

    const onEditClick = useCallback(() => {
        if (!timeQualityConfiguration) return;
        navigate(`../${Resource.TimeQualityConfigurations.toLowerCase()}/edit/${timeQualityConfiguration.uuid}`);
    }, [timeQualityConfiguration, navigate]);

    const onDeleteConfirmed = useCallback(() => {
        if (!timeQualityConfiguration) return;
        dispatch(actions.deleteTimeQualityConfiguration({ uuid: timeQualityConfiguration.uuid }));
        setConfirmDelete(false);
    }, [timeQualityConfiguration, dispatch]);

    const buttons: WidgetButtonProps[] = useMemo(
        () => [
            {
                id: 'edit',
                icon: 'pencil',
                disabled: false,
                tooltip: 'Edit',
                onClick: onEditClick,
            },
            {
                id: 'delete',
                icon: 'trash',
                disabled: false,
                tooltip: 'Delete',
                onClick: () => setConfirmDelete(true),
            },
        ],
        [onEditClick],
    );

    const tableHeader: TableHeader[] = useMemo(() => createWidgetDetailHeaders(), []);

    const signingProfilesTableHeaders: TableHeader[] = useMemo(
        () => [
            { id: 'name', content: 'Name', sortable: true },
            { id: 'enabled', content: 'Enabled' },
        ],
        [],
    );

    const signingProfilesTableData: TableDataRow[] = useMemo(
        () =>
            associatedSigningProfiles.map((sp) => ({
                id: sp.uuid,
                columns: [
                    <Link key="name" to={`/${Resource.SigningProfiles.toLowerCase()}/detail/${sp.uuid}`}>
                        {sp.name}
                    </Link>,
                    <StatusBadge key="enabled" enabled={sp.enabled} />,
                ],
            })),
        [associatedSigningProfiles],
    );

    const generalData: TableDataRow[] = useMemo(
        () =>
            timeQualityConfiguration
                ? [
                      {
                          id: 'uuid',
                          columns: ['UUID', timeQualityConfiguration.uuid],
                      },
                      {
                          id: 'name',
                          columns: ['Name', timeQualityConfiguration.name],
                      },
                      {
                          id: 'accuracy',
                          columns: [
                              'Accuracy',
                              <span key="accuracy-value" className="font-mono">
                                  {getInputStringFromIso8601String(timeQualityConfiguration.accuracy)}
                              </span>,
                          ],
                      },
                      {
                          id: 'leapSecondGuard',
                          columns: ['Leap Second Guard', timeQualityConfiguration.leapSecondGuard ? 'Yes' : 'No'],
                      },
                  ]
                : [],
        [timeQualityConfiguration],
    );

    const ntpData: TableDataRow[] = useMemo(
        () =>
            timeQualityConfiguration
                ? [
                      {
                          id: 'ntpServers',
                          columns: [
                              'NTP Servers',
                              <ul key="ntpServers-list" className="list-disc list-inside">
                                  {timeQualityConfiguration.ntpServers.map((s) => (
                                      <li key={s} className="font-mono text-sm">
                                          {s}
                                      </li>
                                  ))}
                              </ul>,
                          ],
                      },
                      ...(timeQualityConfiguration.ntpCheckInterval
                          ? [
                                {
                                    id: 'ntpCheckInterval',
                                    columns: [
                                        'Check Interval',
                                        <span key="ntpCheckInterval-value" className="font-mono">
                                            {getInputStringFromIso8601String(timeQualityConfiguration.ntpCheckInterval)}
                                        </span>,
                                    ],
                                },
                            ]
                          : []),
                      ...(timeQualityConfiguration.ntpCheckTimeout
                          ? [
                                {
                                    id: 'ntpCheckTimeout',
                                    columns: [
                                        'Check Timeout',
                                        <span key="ntpCheckTimeout-value" className="font-mono">
                                            {getInputStringFromIso8601String(timeQualityConfiguration.ntpCheckTimeout)}
                                        </span>,
                                    ],
                                },
                            ]
                          : []),
                      ...(timeQualityConfiguration.ntpSamplesPerServer === undefined
                          ? []
                          : [
                                {
                                    id: 'ntpSamplesPerServer',
                                    columns: ['Samples per Server', String(timeQualityConfiguration.ntpSamplesPerServer)],
                                },
                            ]),
                      ...(timeQualityConfiguration.ntpServersMinReachable === undefined
                          ? []
                          : [
                                {
                                    id: 'ntpServersMinReachable',
                                    columns: ['Min Reachable Servers', String(timeQualityConfiguration.ntpServersMinReachable)],
                                },
                            ]),
                      ...(timeQualityConfiguration.maxClockDrift
                          ? [
                                {
                                    id: 'maxClockDrift',
                                    columns: [
                                        'Max Clock Drift',
                                        <span key="maxClockDrift-value" className="font-mono">
                                            {getInputStringFromIso8601String(timeQualityConfiguration.maxClockDrift)}
                                        </span>,
                                    ],
                                },
                            ]
                          : []),
                  ]
                : [],
        [timeQualityConfiguration],
    );

    return (
        <div>
            <Breadcrumb
                items={[
                    {
                        label: 'Time Quality Configurations',
                        href: `/${Resource.TimeQualityConfigurations.toLowerCase()}`,
                    },
                    { label: timeQualityConfiguration?.name || 'Time Quality Configuration Details', href: '' },
                ]}
            />

            <Widget widgetLockName={LockWidgetNameEnum.TimeQualityConfigurationDetails} busy={isBusy} noBorder>
                <Container>
                    <Container className="md:grid grid-cols-2 items-start">
                        <Widget
                            title="Time Quality Configuration Details"
                            widgetButtons={buttons}
                            titleSize="large"
                            refreshAction={getFreshData}
                        >
                            <CustomTable headers={tableHeader} data={generalData} />
                        </Widget>

                        {timeQualityConfiguration && (
                            <CustomAttributeWidget
                                resource={Resource.TimeQualityConfigurations}
                                resourceUuid={timeQualityConfiguration.uuid}
                                attributes={timeQualityConfiguration.customAttributes}
                            />
                        )}
                    </Container>

                    <Widget title="NTP Settings" titleSize="large">
                        {ntpData.length > 0 && <CustomTable headers={tableHeader} data={ntpData} />}
                    </Widget>
                    <Widget title="Used by Signing Profiles" titleSize="large" busy={isFetchingAssociatedSigningProfiles}>
                        {associatedSigningProfiles.length > 0 ? (
                            <CustomTable headers={signingProfilesTableHeaders} data={signingProfilesTableData} />
                        ) : (
                            !isFetchingAssociatedSigningProfiles && (
                                <p className="text-sm text-gray-400">
                                    No Signing Profiles are currently using this Time Quality Configuration.
                                </p>
                            )
                        )}
                    </Widget>
                </Container>
            </Widget>

            <Dialog
                isOpen={confirmDelete}
                caption="Delete Time Quality Configuration"
                body="You are about to delete this Time Quality Configuration. Is this what you want to do?"
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                buttons={[
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                ]}
            />

            <Dialog
                isOpen={deleteErrorMessage.length > 0}
                caption="Delete Time Quality Configuration"
                body={
                    <>
                        Failed to delete the Time Quality Configuration. Please find the details below:
                        <br />
                        <br />
                        {deleteErrorMessage}
                    </>
                }
                toggle={() => dispatch(actions.clearDeleteErrorMessages())}
                buttons={[
                    {
                        color: 'secondary',
                        variant: 'outline',
                        onClick: () => dispatch(actions.clearDeleteErrorMessages()),
                        body: 'Close',
                    },
                ]}
            />
        </div>
    );
};
