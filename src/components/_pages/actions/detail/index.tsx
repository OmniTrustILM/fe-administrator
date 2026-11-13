import type { ApiClients } from '../../../../api';
import CustomTable, { type TableDataRow } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import ConditionsExecutionsList from 'components/ExecutionConditionItemsList';
import { EnumColumnDescription } from 'components/EnumDescription';
import Breadcrumb from 'components/Breadcrumb';
import Widget from 'components/Widget';
import EditNameDescriptionDialog from 'components/EditNameDescriptionDialog';
import { propertyValueActionsHeaders } from 'utils/automationDetailUtils';
import { getEditAndDeleteWidgetButtons } from 'utils/widget';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { actions as rulesActions, selectors as rulesSelectors } from 'ducks/rules';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router';
import { PlatformEnum, Resource, ResourceAction } from 'types/openapi';
import { useActionAvailability } from 'utils/useActionAvailability';
import Button from 'components/Button';
import Container from 'components/Container';
import { Trash2 } from 'lucide-react';
import DetailPageSkeleton from 'components/DetailPageSkeleton';

interface SelectChangeValue {
    value: string;
    label: string;
}
const RuleDetails = () => {
    const { id } = useParams();
    const can = useActionAvailability(Resource.Actions);
    const dispatch = useDispatch();
    const actionDetails = useSelector(rulesSelectors.actionDetails);
    const isUpdatingAction = useSelector(rulesSelectors.isUpdatingAction);
    const isFetchingActionDetails = useSelector(rulesSelectors.isFetchingActionDetails);
    const resourceTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const executionTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.ExecutionType));
    const executions = useSelector(rulesSelectors.executions);

    const [confirmDelete, setConfirmDelete] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);

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

    const onEditSubmit = useCallback(
        ({ name, description }: { name: string; description: string }) => {
            if (!id) return;
            dispatch(
                rulesActions.updateAction({
                    actionUuid: id,
                    action: {
                        name,
                        description,
                        executionsUuids: actionDetails?.executions?.length
                            ? actionDetails?.executions.map((execution) => execution.uuid)
                            : [],
                    },
                }),
            );
            setIsEditOpen(false);
        },
        [dispatch, id, actionDetails],
    );

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

    const buttons = useMemo(() => getEditAndDeleteWidgetButtons(() => setIsEditOpen(true), setConfirmDelete, can), [can]);
    const tableHeader = propertyValueActionsHeaders;

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
                          columns: ['Description', actionDetails.description || '', ''],
                      },
                  ],
        [actionDetails, resourceTypeEnum, isFetchingActionDetails],
    );

    const executionDataHeaders = useMemo(
        () => [
            {
                id: 'name',
                content: 'Name',
            },
            {
                id: 'type',
                content: (
                    <span className="inline-flex items-center gap-1">
                        Type
                        <EnumColumnDescription platformEnum={PlatformEnum.ExecutionType} title="Type" />
                    </span>
                ),
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
        const conditionGroupData = actionDetails?.executions.length
            ? actionDetails?.executions.map((conditionGroup) => {
                  return {
                      id: conditionGroup.uuid,
                      columns: [
                          <Link key="name" to={`../../executions/detail/${conditionGroup.uuid}`}>
                              {conditionGroup.name}
                          </Link>,
                          getEnumLabel(executionTypeEnum, conditionGroup.type) || '',
                          conditionGroup.description || '',
                          <Button
                              key="delete"
                              variant="transparent"
                              color="danger"
                              title={
                                  isDeleteDisabled
                                      ? 'Cannot delete this execution as there are no other executions in the action'
                                      : 'Delete Condition Group'
                              }
                              requires={can(ResourceAction.Update)}
                              onClick={() => {
                                  onDeleteExecution(conditionGroup.uuid);
                              }}
                              disabled={isDeleteDisabled}
                          >
                              <Trash2 size={16} />
                          </Button>,
                      ],
                  };
              })
            : [];

        return conditionGroupData;
    }, [actionDetails, isUpdatingAction, onDeleteExecution, isFetchingActionDetails, executionTypeEnum, can]);

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
                getSourceAvailableFiltersApi={(apiClients: ApiClients) =>
                    apiClients.resources.listResourceRuleFilterFields({ resource: actionDetails.resource })
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
                                    requires: can(ResourceAction.Update),
                                }}
                            />
                        </Widget>
                    </div>
                </div>

                {renderActionExecutions}
                <EditNameDescriptionDialog
                    isOpen={isEditOpen}
                    caption="Edit Action"
                    name={actionDetails?.name || ''}
                    description={actionDetails?.description || ''}
                    isUpdating={isUpdatingAction}
                    onClose={() => setIsEditOpen(false)}
                    onSubmit={onEditSubmit}
                />
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
