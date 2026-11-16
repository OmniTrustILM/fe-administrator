import DetailPageSkeleton from 'components/DetailPageSkeleton';
import type { ApiClients } from '../../../../api';
import CustomTable, { type TableDataRow } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import ConditionsExecutionsList from 'components/ExecutionConditionItemsList';
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
import Button from 'components/Button';
import Container from 'components/Container';
import { PlatformEnum, Resource, ResourceAction } from 'types/openapi';
import { useActionAvailability } from 'utils/useActionAvailability';
import { EnumColumnDescription, EnumValueDescription } from 'components/EnumDescription';
import { Trash2 } from 'lucide-react';

interface SelectChangeValue {
    value: string;
    label: string;
}
const RuleDetails = () => {
    const { id } = useParams();
    const can = useActionAvailability(Resource.Rules);
    const dispatch = useDispatch();
    const ruleDetails = useSelector(rulesSelectors.ruleDetails);
    const isUpdatingRule = useSelector(rulesSelectors.isUpdatingRule);
    const isFetchingRuleDetails = useSelector(rulesSelectors.isFetchingRuleDetails);
    const resourceTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const conditions = useSelector(rulesSelectors.conditions);
    const conditionTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.ConditionType));

    const [confirmDelete, setConfirmDelete] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);

    const getFreshDetails = useCallback(() => {
        if (!id) return;
        dispatch(rulesActions.getRule({ ruleUuid: id }));
    }, [dispatch, id]);

    useEffect(() => {
        getFreshDetails();
    }, [getFreshDetails]);

    useEffect(() => {
        dispatch(rulesActions.listConditions({ resource: ruleDetails?.resource }));
    }, [ruleDetails, dispatch]);

    const isBusy = useMemo(() => isFetchingRuleDetails || isUpdatingRule, [isFetchingRuleDetails, isUpdatingRule]);

    const conditionsOptions = useMemo(() => {
        if (conditions === undefined) return [];
        return conditions
            .map((conditions) => {
                return { value: conditions.uuid, label: conditions.name };
            })
            .filter((conditions) => !ruleDetails?.conditions?.map((condition) => condition.uuid).includes(conditions.value));
    }, [conditions, ruleDetails]);

    const onDeleteConfirmed = useCallback(() => {
        if (!id) return;
        dispatch(rulesActions.deleteRule({ ruleUuid: id }));
        setConfirmDelete(false);
    }, [dispatch, id]);

    const onEditSubmit = useCallback(
        ({ name, description }: { name: string; description: string }) => {
            if (!id) return;
            dispatch(
                rulesActions.updateRule({
                    ruleUuid: id,
                    rule: {
                        name,
                        description,
                        conditionsUuids: ruleDetails?.conditions?.length ? ruleDetails?.conditions.map((condition) => condition.uuid) : [],
                    },
                }),
            );
            setIsEditOpen(false);
        },
        [dispatch, id, ruleDetails],
    );

    const onUpdateConditionsConfirmed = useCallback(
        (newValues: SelectChangeValue[]) => {
            if (!id) return;

            const newConditionsUuids = newValues.map((condition) => condition.value);

            const previousAndNewConditionsUuid = ruleDetails?.conditions.map((condition) => condition.uuid);
            const allConditions = [...(previousAndNewConditionsUuid || []), ...newConditionsUuids];

            dispatch(
                rulesActions.updateRule({
                    ruleUuid: id,
                    rule: {
                        description: ruleDetails?.description || '',
                        conditionsUuids: allConditions,
                    },
                }),
            );
        },
        [dispatch, id, ruleDetails],
    );

    const onDeleteCondition = useCallback(
        (conditionUuid: string) => {
            if (!id) return;

            const updatedConditionsUuids = ruleDetails?.conditions
                .filter((condition) => condition.uuid !== conditionUuid)
                .map((condition) => condition.uuid);
            dispatch(
                rulesActions.updateRule({
                    ruleUuid: id,
                    rule: {
                        description: ruleDetails?.description || '',
                        conditionsUuids: updatedConditionsUuids?.length ? updatedConditionsUuids : [],
                    },
                }),
            );
        },
        [dispatch, id, ruleDetails?.conditions, ruleDetails?.description],
    );

    const buttons = useMemo(() => getEditAndDeleteWidgetButtons(() => setIsEditOpen(true), setConfirmDelete, can), [can]);
    const ruleTableHeaders = propertyValueActionsHeaders;

    const ruleDetailsData: TableDataRow[] = useMemo(
        () =>
            !ruleDetails || isFetchingRuleDetails
                ? []
                : [
                      {
                          id: 'uuid',
                          columns: ['UUID', ruleDetails.uuid, ''],
                      },
                      {
                          id: 'name',
                          columns: ['Name', ruleDetails.name, ''],
                      },
                      {
                          id: 'resource',
                          columns: [
                              'Resource',
                              <span key="resource" className="inline-flex items-center gap-1">
                                  {getEnumLabel(resourceTypeEnum, ruleDetails.resource)}
                                  <EnumValueDescription platformEnum={PlatformEnum.Resource} value={ruleDetails.resource} />
                              </span>,
                              '',
                          ],
                      },
                      {
                          id: 'description',
                          columns: ['Description', ruleDetails.description || '', ''],
                      },
                  ],
        [ruleDetails, resourceTypeEnum, isFetchingRuleDetails],
    );

    const conditionsTableHeader = useMemo(
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
                        <EnumColumnDescription platformEnum={PlatformEnum.ConditionType} title="Type" />
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

    const conditionsData: TableDataRow[] = useMemo(() => {
        const isDeleteDisabled = ruleDetails?.conditions.length === 1 || isFetchingRuleDetails || isUpdatingRule;
        const conditionsData = ruleDetails?.conditions.length
            ? ruleDetails?.conditions.map((condition) => {
                  return {
                      id: condition.uuid,
                      columns: [
                          <Link key="name" to={`../../conditions/detail/${condition.uuid}`}>
                              {condition.name}
                          </Link>,
                          getEnumLabel(conditionTypeEnum, condition.type),
                          condition.description || '',
                          <Button
                              key="delete"
                              variant="transparent"
                              color="danger"
                              title={
                                  isDeleteDisabled
                                      ? 'Cannot delete this condition as there are no other conditions in the rule'
                                      : 'Delete Condition'
                              }
                              requires={can(ResourceAction.Update)}
                              onClick={() => {
                                  onDeleteCondition(condition.uuid);
                              }}
                              disabled={isDeleteDisabled}
                          >
                              <Trash2 size={16} />
                          </Button>,
                      ],
                  };
              })
            : [];

        return conditionsData;
    }, [ruleDetails, isUpdatingRule, onDeleteCondition, isFetchingRuleDetails, conditionTypeEnum, can]);

    const renderRuleConditions = useMemo(() => {
        return ruleDetails?.conditions.length ? (
            <ConditionsExecutionsList
                listType="conditionsItems"
                ruleConditions={ruleDetails?.conditions}
                getAvailableFiltersApi={(apiClients: ApiClients) =>
                    apiClients.resources.listResourceRuleFilterFields({
                        resource: ruleDetails?.resource || Resource.None,
                    })
                }
            />
        ) : (
            <></>
        );
    }, [ruleDetails]);

    if (isFetchingRuleDetails) {
        return <DetailPageSkeleton layout="simple" buttonsCount={2} />;
    }

    return (
        <Container>
            <Breadcrumb
                items={[
                    { label: `${getEnumLabel(resourceTypeEnum, Resource.Rules)} Inventory`, href: '/rules' },
                    { label: ruleDetails?.name || 'Rule Details', href: '' },
                ]}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Widget refreshAction={getFreshDetails} busy={isBusy} title="Rule Details" titleSize="large" widgetButtons={buttons}>
                        <CustomTable data={ruleDetailsData} headers={ruleTableHeaders} />
                    </Widget>
                </div>
                <div>
                    <Widget
                        busy={isBusy}
                        title="Conditions"
                        titleSize="large"
                        widgetInfoCard={{
                            title: 'Information',
                            description: 'Conditions is named set of conditions items',
                        }}
                    >
                        <CustomTable
                            data={conditionsData}
                            headers={conditionsTableHeader}
                            newRowWidgetProps={{
                                isBusy: isUpdatingRule,
                                newItemsList: conditionsOptions,
                                onAddClick: onUpdateConditionsConfirmed,
                                requires: can(ResourceAction.Update),
                            }}
                        />
                    </Widget>
                </div>
            </div>
            {renderRuleConditions}
            <EditNameDescriptionDialog
                isOpen={isEditOpen}
                caption="Edit Rule"
                name={ruleDetails?.name || ''}
                description={ruleDetails?.description || ''}
                isUpdating={isUpdatingRule}
                onClose={() => setIsEditOpen(false)}
                onSubmit={onEditSubmit}
            />
            <Dialog
                isOpen={confirmDelete}
                caption={`Delete a Rule`}
                body={`You are about to delete a Rule. Is this what you want to do?`}
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

export default RuleDetails;
