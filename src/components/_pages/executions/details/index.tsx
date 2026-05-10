import DetailPageSkeleton from 'components/DetailPageSkeleton';
import { SendNotificationExecutionItems } from 'components/_pages/executions/SendNotificationExecutionItems';
import ConditionAndSetFieldExecutionItemsViewer from 'components/ConditionAndSetFieldExecutionItemsViewer';
import CustomTable, { type TableDataRow } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import Breadcrumb from 'components/Breadcrumb';
import Widget from 'components/Widget';
import { propertyValueActionsHeaders, createDeleteButton } from 'utils/automationDetailUtils';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { actions as rulesActions, selectors as rulesSelectors } from 'ducks/rules';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router';
import Button from 'components/Button';
import Container from 'components/Container';
import TextInput from 'components/TextInput';
import { ExecutionType, PlatformEnum, Resource } from 'types/openapi';
import { Check, X } from 'lucide-react';
import EditIcon from 'components/icons/EditIcon';

const ExecutionDetails = () => {
    const { id } = useParams();
    const dispatch = useDispatch();
    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const executionTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.ExecutionType));
    const executionDetails = useSelector(rulesSelectors.executionDetails);
    const isFetchingDetails = useSelector(rulesSelectors.isFetchingExecutionDetails);
    const isUpdatingDetails = useSelector(rulesSelectors.isUpdatingExecution);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [updateDescriptionEditEnable, setUpdateDescription] = useState<boolean>(false);
    const [updatedDescription, setUpdatedDescription] = useState('');

    const isBusy = useMemo(() => isFetchingDetails || isUpdatingDetails, [isFetchingDetails, isUpdatingDetails]);

    useEffect(() => {
        if (!executionDetails?.description || executionDetails.uuid !== id) return;
        setUpdatedDescription(executionDetails.description);
    }, [executionDetails, id]);

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

    const onUpdateDescriptionConfirmed = useCallback(() => {
        if (!id || !updateDescriptionEditEnable) return;
        if (updatedDescription !== executionDetails?.description) {
            dispatch(
                rulesActions.updateExecution({
                    executionUuid: id,
                    execution: {
                        description: updatedDescription,
                        items: executionDetails?.items || [],
                    },
                }),
            );
        }
        setUpdateDescription(false);
    }, [dispatch, id, executionDetails, updatedDescription, updateDescriptionEditEnable]);

    const buttons = useMemo(() => createDeleteButton(() => setConfirmDelete(true)), []);
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
                          columns: ['Type', getEnumLabel(executionTypeEnum, executionDetails.type), ''],
                      },
                      {
                          id: 'resource',
                          columns: ['Resource', getEnumLabel(resourceEnum, executionDetails.resource), ''],
                      },
                      {
                          id: 'description',
                          columns: [
                              'Description',
                              updateDescriptionEditEnable ? (
                                  <TextInput
                                      key="desc-input"
                                      onChange={(value) => setUpdatedDescription(value)}
                                      value={updatedDescription}
                                      placeholder="Enter Description"
                                  />
                              ) : (
                                  executionDetails.description || ''
                              ),
                              <div key="desc-actions">
                                  {updateDescriptionEditEnable ? (
                                      <div className="flex gap-2">
                                          <Button
                                              variant="transparent"
                                              color="secondary"
                                              title="Update Description"
                                              onClick={onUpdateDescriptionConfirmed}
                                              disabled={
                                                  isUpdatingDetails ||
                                                  updatedDescription === executionDetails.description ||
                                                  updatedDescription === ''
                                              }
                                          >
                                              <Check size={16} />
                                          </Button>
                                          <Button
                                              variant="transparent"
                                              color="danger"
                                              title="Cancel"
                                              onClick={() => {
                                                  setUpdateDescription(false);
                                                  setUpdatedDescription(executionDetails?.description || '');
                                              }}
                                              disabled={isUpdatingDetails}
                                          >
                                              <X size={16} />
                                          </Button>
                                      </div>
                                  ) : (
                                      <Button
                                          variant="transparent"
                                          color="secondary"
                                          title="Update Description"
                                          onClick={() => {
                                              setUpdateDescription(true);
                                          }}
                                          disabled={isUpdatingDetails}
                                      >
                                          <EditIcon size={16} />
                                      </Button>
                                  )}
                              </div>,
                          ],
                      },
                  ],
        [
            executionDetails,
            executionTypeEnum,
            resourceEnum,
            setUpdateDescription,
            updateDescriptionEditEnable,
            onUpdateDescriptionConfirmed,
            isUpdatingDetails,
            updatedDescription,
            isFetchingDetails,
        ],
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
                    { label: `${getEnumLabel(resourceEnum, Resource.Actions)} Inventory`, href: '/actions/1' },
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
