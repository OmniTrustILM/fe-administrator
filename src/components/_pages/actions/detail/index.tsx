import type { ApiClients } from '../../../../api';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import ConditionsExecutionsList from 'components/ExecutionConditionItemsList';
import Breadcrumb from 'components/Breadcrumb';
import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { actions as rulesActions, selectors as rulesSelectors } from 'ducks/rules';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router';
import { PlatformEnum, Resource } from 'types/openapi';
import Button from 'components/Button';
import Container from 'components/Container';
import TextInput from 'components/TextInput';
import { Check, X, Trash2 } from 'lucide-react';
import EditIcon from 'components/icons/EditIcon';
import DetailPageSkeleton from 'components/DetailPageSkeleton';

interface SelectChangeValue {
    value: string;
    label: string;
}
const RuleDetails = () => {
    const { id } = useParams();
    const dispatch = useDispatch();
    const actionDetails = useSelector(rulesSelectors.actionDetails);
    const isUpdatingAction = useSelector(rulesSelectors.isUpdatingAction);
    const isFetchingActionDetails = useSelector(rulesSelectors.isFetchingActionDetails);
    const resourceTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const executionTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.ExecutionType));
    const executions = useSelector(rulesSelectors.executions);

    const [confirmDelete, setConfirmDelete] = useState(false);
    const [updateDescriptionEditEnable, setUpdateDescription] = useState<boolean>(false);
    const [updatedDescription, setUpdatedDescription] = useState('');

    useEffect(() => {
        if (!actionDetails?.description || actionDetails.uuid !== id) return;
        setUpdatedDescription(actionDetails.description);
    }, [actionDetails, id]);

    const getFreshDetails = useCallback(() => {
        if (!id) return;
        dispatch(rulesActions.getAction({ actionUuid: id }));
    }, [dispatch, id]);

    useEffect(() => {
        getFreshDetails();
    }, [getFreshDetails]);

    useEffect(() => {
        dispatch(rulesActions.listExecutions({ resource: actionDetails?.resource }));
    }, [actionDetails, dispatch]);

    const isBusy = useMemo(() => isFetchingActionDetails || isUpdatingAction, [isFetchingActionDetails, isUpdatingAction]);

    const executionsOptions = useMemo(() => {
        if (executions === undefined) return [];
        return executions
            .map((conditions) => {
                return { value: conditions.uuid, label: conditions.name };
            })
            .filter((conditions) => !actionDetails?.executions?.map((condition) => condition.uuid).includes(conditions.value));
    }, [executions, actionDetails]);

    const onDeleteConfirmed = useCallback(() => {
        if (!id) return;
        dispatch(rulesActions.deleteAction({ actionUuid: id }));
        setConfirmDelete(false);
    }, [dispatch, id]);

    const onUpdateDescriptionConfirmed = useCallback(() => {
        if (!id || !updateDescriptionEditEnable) return;
        if (updatedDescription !== actionDetails?.description) {
            dispatch(
                rulesActions.updateAction({
                    actionUuid: id,
                    action: {
                        description: updatedDescription,
                        executionsUuids: actionDetails?.executions?.length
                            ? actionDetails?.executions.map((execution) => execution.uuid)
                            : [],
                    },
                }),
            );
        }
        setUpdateDescription(false);
    }, [dispatch, id, actionDetails, updatedDescription, updateDescriptionEditEnable]);

    const onUpdateExecutionsConfirmed = useCallback(
        (newValues: SelectChangeValue[]) => {
            if (!id) return;

            const newExecutionsUuids = newValues.map((execution) => execution.value);

            const previousAndNewExecutionsUuid = actionDetails?.executions.map((execution) => execution.uuid);
            const allConditionGroups = [...(previousAndNewExecutionsUuid || []), ...newExecutionsUuids];

            dispatch(
                rulesActions.updateAction({
                    actionUuid: id,
                    action: {
                        description: actionDetails?.description || '',
                        executionsUuids: allConditionGroups,
                    },
                }),
            );
        },
        [dispatch, id, actionDetails],
    );

    const onDeleteExecution = useCallback(
        (executionUuid: string) => {
            if (!id) return;

            const updatedExecutionsUuid = actionDetails?.executions
                .filter((execution) => execution.uuid !== executionUuid)
                .map((execution) => execution.uuid);
            dispatch(
                rulesActions.updateAction({
                    actionUuid: id,
                    action: {
                        description: actionDetails?.description || '',
                        executionsUuids: updatedExecutionsUuid?.length ? updatedExecutionsUuid : [],
                    },
                }),
            );
        },
        [dispatch, id, actionDetails?.executions, actionDetails?.description],
    );

    const buttons: WidgetButtonProps[] = useMemo(
        () => [
            {
                icon: 'trash',
                disabled: false,
                onClick: () => setConfirmDelete(true),
            },
        ],
        [],
    );

    const tableHeader: TableHeader[] = useMemo(
        () => [
            {
                id: 'property',
                content: 'Property',
            },
            {
                id: 'value',
                content: 'Value',
            },
            {
                id: 'actions',
                content: 'Actions',
                align: 'center',
            },
        ],
        [],
    );

    const conditionGroupsDetailData: TableDataRow[] = useMemo(
        () =>
            !actionDetails || isFetchingActionDetails
                ? []
                : [
                      {
                          id: 'uuid',
                          columns: ['UUID', actionDetails.uuid, ''],
                      },
                      {
                          id: 'name',
                          columns: ['Name', actionDetails.name, ''],
                      },
                      {
                          id: 'resource',
                          columns: ['Resource', getEnumLabel(resourceTypeEnum, actionDetails.resource), ''],
                      },

                      {
                          id: 'description',
                          columns: [
                              'Description',
                              updateDescriptionEditEnable ? (
                                  <TextInput
                                      value={updatedDescription}
                                      onChange={(value) => setUpdatedDescription(value)}
                                      placeholder="Enter Description"
                                  />
                              ) : (
                                  actionDetails.description || ''
                              ),
                              <div key="description-actions" className="flex items-center gap-2">
                                  {updateDescriptionEditEnable ? (
                                      <>
                                          <Button
                                              variant="transparent"
                                              color="primary"
                                              title="Update Description"
                                              onClick={onUpdateDescriptionConfirmed}
                                              disabled={
                                                  isUpdatingAction ||
                                                  updatedDescription === actionDetails.description ||
                                                  updatedDescription === ''
                                              }
                                          >
                                              <Check size={16} />
                                          </Button>
                                          <Button
                                              variant="transparent"
                                              color="danger"
                                              title="Cancel"
                                              disabled={isUpdatingAction}
                                              onClick={() => {
                                                  setUpdateDescription(false);
                                                  setUpdatedDescription(actionDetails?.description || '');
                                              }}
                                          >
                                              <X size={16} />
                                          </Button>
                                      </>
                                  ) : (
                                      <Button
                                          variant="transparent"
                                          color="secondary"
                                          title="Update Description"
                                          onClick={() => {
                                              setUpdateDescription(true);
                                          }}
                                      >
                                          <EditIcon size={16} />
                                      </Button>
                                  )}
                              </div>,
                          ],
                      },
                  ],
        [
            actionDetails,
            resourceTypeEnum,
            onUpdateDescriptionConfirmed,
            updateDescriptionEditEnable,
            isUpdatingAction,
            updatedDescription,
            isFetchingActionDetails,
        ],
    );

    const executionDataHeaders = useMemo(
        () => [
            {
                id: 'name',
                content: 'Name',
            },
            {
                id: 'type',
                content: 'Type',
            },
            {
                id: 'description',
                content: 'Description',
            },
            {
                id: 'actions',
                content: 'Actions',
            },
        ],
        [],
    );

    const executionsData: TableDataRow[] = useMemo(() => {
        const isDeleteDisabled = actionDetails?.executions.length === 1 || isFetchingActionDetails || isUpdatingAction;
        const conditionGroupData = !actionDetails?.executions.length
            ? []
            : actionDetails?.executions.map((conditionGroup) => {
                  return {
                      id: conditionGroup.uuid,
                      columns: [
                          <Link to={`../../executions/detail/${conditionGroup.uuid}`}>{conditionGroup.name}</Link>,
                          getEnumLabel(executionTypeEnum, conditionGroup.type) || '',
                          conditionGroup.description || '',
                          <Button
                              variant="transparent"
                              color="danger"
                              title={
                                  isDeleteDisabled
                                      ? 'Cannot delete this execution as there are no other executions in the action'
                                      : 'Delete Condition Group'
                              }
                              onClick={() => {
                                  onDeleteExecution(conditionGroup.uuid);
                              }}
                              disabled={isDeleteDisabled}
                          >
                              <Trash2 size={16} />
                          </Button>,
                      ],
                  };
              });

        return conditionGroupData;
    }, [actionDetails, isUpdatingAction, onDeleteExecution, isFetchingActionDetails, executionTypeEnum]);

    const renderActionExecutions = useMemo(() => {
        return actionDetails?.executions.length ? (
            <ConditionsExecutionsList
                listType="executionItems"
                actionExecutions={actionDetails?.executions}
                getAvailableFiltersApi={(apiClients: ApiClients) =>
                    apiClients.resources.listResourceRuleFilterFields({
                        resource: actionDetails.resource,
                        settable: true,
                    })
                }
            />
        ) : (
            <></>
        );
    }, [actionDetails]);

    if (isFetchingActionDetails) {
        return <DetailPageSkeleton layout="simple" buttonsCount={2} />;
    }

    return (
        <div>
            <Breadcrumb
                items={[
                    { label: `${getEnumLabel(resourceTypeEnum, Resource.Actions)} Inventory`, href: '/actions' },
                    { label: actionDetails?.name || 'Action Details', href: '' },
                ]}
            />
            <Container>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Widget
                            refreshAction={getFreshDetails}
                            busy={isBusy}
                            title="Action Details"
                            titleSize="large"
                            widgetButtons={buttons}
                        >
                            <CustomTable data={conditionGroupsDetailData} headers={tableHeader} />
                        </Widget>
                    </div>
                    <div>
                        <Widget
                            busy={isBusy}
                            title="Executions"
                            titleSize="large"
                            widgetInfoCard={{
                                title: 'Information',
                                description: 'Execution is named set of execution items',
                            }}
                        >
                            <CustomTable
                                data={executionsData}
                                headers={executionDataHeaders}
                                newRowWidgetProps={{
                                    isBusy: isUpdatingAction,
                                    newItemsList: executionsOptions,
                                    onAddClick: onUpdateExecutionsConfirmed,
                                }}
                            />
                        </Widget>
                    </div>
                </div>

                {renderActionExecutions}
                <Dialog
                    isOpen={confirmDelete}
                    caption={`Delete an Action`}
                    body={`You are about to delete an action. Is this what you want to do?`}
                    toggle={() => setConfirmDelete(false)}
                    icon="delete"
                    buttons={[
                        { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                        { color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                    ]}
                />
            </Container>
        </div>
    );
};

export default RuleDetails;
