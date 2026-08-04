import DetailPageSkeleton from 'components/DetailPageSkeleton';
import { SendNotificationExecutionItems } from 'components/_pages/executions/SendNotificationExecutionItems';
import ConditionAndSetFieldExecutionItemsViewer from 'components/ConditionAndSetFieldExecutionItemsViewer';
import CustomTable, { type TableDataRow } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import { EnumValueDescription } from 'components/EnumDescription';
import Breadcrumb from 'components/Breadcrumb';
import Widget from 'components/Widget';
import EditNameDescriptionDialog from 'components/EditNameDescriptionDialog';
import { propertyValueActionsHeaders } from 'utils/automationDetailUtils';
import { getEditAndDeleteWidgetButtons } from 'utils/widget';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { actions as rulesActions, selectors as rulesSelectors } from 'ducks/rules';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router';
import Container from 'components/Container';
import { ExecutionType, PlatformEnum, Resource } from 'types/openapi';

const ExecutionDetails = () => {
    const { id } = useParams();
    const dispatch = useDispatch();
    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const executionTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.ExecutionType));
    const executionDetails = useSelector(rulesSelectors.executionDetails);
    const isFetchingDetails = useSelector(rulesSelectors.isFetchingExecutionDetails);
    const isUpdatingDetails = useSelector(rulesSelectors.isUpdatingExecution);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);

    const isBusy = useMemo(() => isFetchingDetails || isUpdatingDetails, [isFetchingDetails, isUpdatingDetails]);

    const getFreshDetails = useCallback(() => {
        if (!id) return;
        dispatch(rulesActions.getExecution({ executionUuid: id }));
    }, [id, dispatch]);

    useEffect(() => {
        getFreshDetails();
    }, [getFreshDetails]);

    const onDeleteConfirmed = useCallback(() => {
        if (!id) return;
        dispatch(rulesActions.deleteExecution({ executionUuid: id }));
        setConfirmDelete(false);
    }, [dispatch, id]);

    const onUpdateSendNotificationExecutionItems = useCallback(
        (profileUuids: string[]) => {
            if (!id || !executionDetails) return;
            dispatch(
                rulesActions.updateExecution({
                    executionUuid: id,
                    execution: {
                        items: profileUuids.map((el) => ({
                            notificationProfileUuid: el,
                        })),
                    },
                }),
            );
        },
        [id, dispatch, executionDetails],
    );

    const onEditSubmit = useCallback(
        ({ name, description }: { name: string; description: string }) => {
            if (!id) return;
            dispatch(
                rulesActions.updateExecution({
                    executionUuid: id,
                    execution: {
                        name,
                        description,
                        items: executionDetails?.items || [],
                    },
                }),
            );
            setIsEditOpen(false);
        },
        [dispatch, id, executionDetails],
    );

    const buttons = useMemo(() => getEditAndDeleteWidgetButtons(() => setIsEditOpen(true), setConfirmDelete), []);
    const executionTableHeaders = propertyValueActionsHeaders;

    const executionDetailsData: TableDataRow[] = useMemo(
        () =>
            !executionDetails || isFetchingDetails
                ? []
                : [
                      {
                          id: 'uuid',
                          columns: ['UUID', executionDetails.uuid, ''],
                      },
                      {
                          id: 'name',
                          columns: ['Name', executionDetails.name, ''],
                      },
                      {
                          id: 'type',
                          columns: [
                              'Type',
                              <span key="type" className="inline-flex items-center gap-1">
                                  {getEnumLabel(executionTypeEnum, executionDetails.type)}
                                  <EnumValueDescription platformEnum={PlatformEnum.ExecutionType} value={executionDetails.type} />
                              </span>,
                              '',
                          ],
                      },
                      {
                          id: 'resource',
                          columns: ['Resource', getEnumLabel(resourceEnum, executionDetails.resource), ''],
                      },
                      {
                          id: 'description',
                          columns: ['Description', executionDetails.description || '', ''],
                      },
                  ],
        [executionDetails, executionTypeEnum, resourceEnum, isFetchingDetails],
    );

    const renderExecutionItems = useCallback(() => {
        switch (executionDetails?.type) {
            case ExecutionType.SetField:
                return (
                    executionDetails?.resource && (
                        <ConditionAndSetFieldExecutionItemsViewer resource={executionDetails.resource} formType="executionItems" />
                    )
                );
            case ExecutionType.SendNotification:
                return (
                    <div>
                        <SendNotificationExecutionItems
                            mode="detail"
                            isUpdating={isUpdatingDetails}
                            notificationProfileItems={
                                executionDetails.items.map((el) => ({
                                    label: el.notificationProfileName ?? '',
                                    value: el.notificationProfileUuid ?? '',
                                })) ?? []
                            }
                            onNotificationProfileItemsChange={(newItems) =>
                                onUpdateSendNotificationExecutionItems(newItems.map((el) => el.value))
                            }
                        />
                    </div>
                );
        }
    }, [executionDetails, isUpdatingDetails, onUpdateSendNotificationExecutionItems]);

    if (isFetchingDetails && !executionDetails) {
        return <DetailPageSkeleton layout="simple" buttonsCount={1} />;
    }

    return (
        <Container>
            <Breadcrumb
                items={[
                    { label: `${getEnumLabel(resourceEnum, Resource.Actions)} Inventory`, href: '/actions?tab=executions' },
                    { label: executionDetails?.name || 'Execution Details', href: '' },
                ]}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Widget
                        refreshAction={getFreshDetails}
                        busy={isBusy}
                        title="Execution Details"
                        titleSize="large"
                        widgetButtons={buttons}
                    >
                        <CustomTable data={executionDetailsData} headers={executionTableHeaders} />
                    </Widget>
                </div>
            </div>
            <div>{renderExecutionItems()}</div>
            <EditNameDescriptionDialog
                isOpen={isEditOpen}
                caption="Edit Execution"
                name={executionDetails?.name || ''}
                description={executionDetails?.description || ''}
                isUpdating={isUpdatingDetails}
                onClose={() => setIsEditOpen(false)}
                onSubmit={onEditSubmit}
            />
            <Dialog
                isOpen={confirmDelete}
                caption={`Delete an Execution`}
                body={`You are about to delete an Execution. Is this what you want to do?`}
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                buttons={[
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                ]}
            />
        </Container>
    );
};

export default ExecutionDetails;
