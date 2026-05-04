import DetailPageSkeleton from 'components/DetailPageSkeleton';
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
import Button from 'components/Button';
import Container from 'components/Container';
import TextInput from 'components/TextInput';
import { PlatformEnum, Resource } from 'types/openapi';
import { Check, X, Trash2 } from 'lucide-react';
import EditIcon from 'components/icons/EditIcon';
interface SelectChangeValue {
    value: string;
    label: string;
}
const RuleDetails = () => {
    const { id } = useParams();
    const dispatch = useDispatch();
    const ruleDetails = useSelector(rulesSelectors.ruleDetails);
    const isUpdatingRule = useSelector(rulesSelectors.isUpdatingRule);
    const isFetchingRuleDetails = useSelector(rulesSelectors.isFetchingRuleDetails);
    const resourceTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const conditions = useSelector(rulesSelectors.conditions);
    const conditionTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.ConditionType));

    const [confirmDelete, setConfirmDelete] = useState(false);
    const [updateDescriptionEditEnable, setUpdateDescription] = useState<boolean>(false);
    const [updatedDescription, setUpdatedDescription] = useState('');

    useEffect(() => {
        if (!ruleDetails?.description || ruleDetails.uuid !== id) return;
        setUpdatedDescription(ruleDetails.description);
    }, [ruleDetails, id]);

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

    const onUpdateDescriptionConfirmed = useCallback(() => {
        if (!id || !updateDescriptionEditEnable) return;
        if (updatedDescription !== ruleDetails?.description) {
            dispatch(
                rulesActions.updateRule({
                    ruleUuid: id,
                    rule: {
                        description: updatedDescription,
                        conditionsUuids: ruleDetails?.conditions?.length ? ruleDetails?.conditions.map((condition) => condition.uuid) : [],
                    },
                }),
            );
        }
        setUpdateDescription(false);
    }, [dispatch, id, ruleDetails, updatedDescription, updateDescriptionEditEnable]);

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

    const ruleTableHeaders: TableHeader[] = useMemo(
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
                          columns: ['Resource', getEnumLabel(resourceTypeEnum, ruleDetails.resource), ''],
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
                                  ruleDetails.description || ''
                              ),
                              <div>
                                  {updateDescriptionEditEnable ? (
                                      <div className="flex gap-2">
                                          <Button
                                              variant="transparent"
                                              color="secondary"
                                              title="Update Description"
                                              onClick={onUpdateDescriptionConfirmed}
                                              disabled={
                                                  isUpdatingRule ||
                                                  updatedDescription === ruleDetails.description ||
                                                  updatedDescription === ''
                                              }
                                          >
                                              <Check size={16} />
                                          </Button>
                                          <Button
                                              variant="transparent"
                                              color="danger"
                                              title="Cancel"
                                              disabled={isUpdatingRule}
                                              onClick={() => {
                                                  setUpdateDescription(false);
                                                  setUpdatedDescription(ruleDetails?.description || '');
                                              }}
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
                                      >
                                          <EditIcon size={16} />
                                      </Button>
                                  )}
                              </div>,
                          ],
                      },
                  ],
        [
            ruleDetails,
            resourceTypeEnum,
            onUpdateDescriptionConfirmed,
            updateDescriptionEditEnable,
            isUpdatingRule,
            updatedDescription,
            isFetchingRuleDetails,
        ],
    );

    const conditionsTableHeader = useMemo(
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

    const conditionsData: TableDataRow[] = useMemo(() => {
        const isDeleteDisabled = ruleDetails?.conditions.length === 1 || isFetchingRuleDetails || isUpdatingRule;
        const conditionsData = !ruleDetails?.conditions.length
            ? []
            : ruleDetails?.conditions.map((condition) => {
                  return {
                      id: condition.uuid,
                      columns: [
                          <Link to={`../../conditions/detail/${condition.uuid}`}>{condition.name}</Link>,
                          getEnumLabel(conditionTypeEnum, condition.type),
                          condition.description || '',
                          <Button
                              variant="transparent"
                              color="danger"
                              title={
                                  isDeleteDisabled
                                      ? 'Cannot delete this condition as there are no other conditions in the rule'
                                      : 'Delete Condition'
                              }
                              onClick={() => {
                                  onDeleteCondition(condition.uuid);
                              }}
                              disabled={isDeleteDisabled}
                          >
                              <Trash2 size={16} />
                          </Button>,
                      ],
                  };
              });

        return conditionsData;
    }, [ruleDetails, isUpdatingRule, onDeleteCondition, isFetchingRuleDetails, conditionTypeEnum]);

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
                            }}
                        />
                    </Widget>
                </div>
            </div>
            {renderRuleConditions}
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
