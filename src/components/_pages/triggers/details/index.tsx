import DetailPageSkeleton from 'components/DetailPageSkeleton';
import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';
import Dialog from 'components/Dialog';
import FlowChart from 'components/FlowChart';
import TabLayout from 'components/Layout/TabLayout';
import Switch from 'components/Switch';
import Widget from 'components/Widget';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import { actions as alertActions } from 'ducks/alerts';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { actions as rulesActions, selectors as rulesSelectors } from 'ducks/rules';
import { useTransformTriggerObjectToNodesAndEdges } from 'ducks/transform/rules';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router';
import Button from 'components/Button';
import TextInput from 'components/TextInput';
import { PlatformEnum, Resource } from 'types/openapi';
import { DeviceType, useDeviceType } from 'utils/common-hooks';
import Breadcrumb from 'components/Breadcrumb';
import { Check, X, Trash2 } from 'lucide-react';
import EditIcon from 'components/icons/EditIcon';

interface SelectChangeValue {
    value: string;
    label: string;
}
const TriggerDetails = () => {
    const { id } = useParams();
    const dispatch = useDispatch();
    const triggerDetails = useSelector(rulesSelectors.triggerDetails);
    const isUpdatingTrigger = useSelector(rulesSelectors.isUpdatingTrigger);
    const eventNameEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.ResourceEvent));
    const isFetchingTriggerDetail = useSelector(rulesSelectors.isFetchingTriggerDetail);
    const resourceTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const actions = useSelector(rulesSelectors.actionsList);
    const rules = useSelector(rulesSelectors.rules);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [confirmIgnoreTrigger, setConfirmIgnoreTrigger] = useState(false);
    const [updateDescriptionEditEnable, setUpdateDescription] = useState<boolean>(false);
    const [updatedDescription, setUpdatedDescription] = useState('');
    const triggerTypeEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.TriggerType));
    const [highlight, setHighlight] = useState(false);
    const deviceType = useDeviceType();
    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));

    const defaultViewport = useMemo(
        () => ({
            zoom: 0.5,
            x: deviceType === DeviceType.Tablet ? -50 : deviceType === DeviceType.Mobile ? -150 : 300,
            y: 0,
        }),
        [deviceType],
    );
    const { nodes, edges } = useTransformTriggerObjectToNodesAndEdges(triggerDetails, rules, actions);

    useEffect(() => {
        if (!triggerDetails?.description || triggerDetails.uuid !== id) return;
        setUpdatedDescription(triggerDetails.description);
    }, [triggerDetails, id]);

    const triggerHighlight = useCallback(() => {
        setHighlight(true);
        const timer = setTimeout(() => {
            setHighlight(false);
        }, 2000);
        return () => clearTimeout(timer);
    }, []);

    const getFreshDetails = useCallback(() => {
        if (!id) return;
        dispatch(rulesActions.getTrigger({ triggerUuid: id }));
    }, [dispatch, id]);

    useEffect(() => {
        getFreshDetails();
    }, [getFreshDetails]);

    useEffect(() => {
        dispatch(rulesActions.listActions({ resource: triggerDetails?.resource }));
        dispatch(rulesActions.listRules({ resource: triggerDetails?.resource }));
    }, [triggerDetails, dispatch]);

    const isBusy = useMemo(() => isUpdatingTrigger || isFetchingTriggerDetail, [isUpdatingTrigger, isFetchingTriggerDetail]);

    const actionsOptions = useMemo(() => {
        if (actions === undefined) return [];
        return actions
            .map((execution) => {
                return { value: execution.uuid, label: execution.name };
            })
            .filter((execution) => !triggerDetails?.actions?.map((action) => action.uuid).includes(execution.value));
    }, [actions, triggerDetails]);

    const rulesOptions = useMemo(() => {
        if (triggerDetails === undefined) return [];
        return rules
            .map((rule) => {
                return { value: rule.uuid, label: rule.name };
            })
            .filter((rule) => !triggerDetails?.rules.map((rule) => rule.uuid).includes(rule.value));
    }, [triggerDetails, rules]);

    const onDeleteConfirmed = useCallback(() => {
        if (!id) return;
        dispatch(rulesActions.deleteTrigger({ triggerUuid: id }));
        setConfirmDelete(false);
    }, [dispatch, id]);

    const onIgnoreTriggerConfirmed = useCallback(() => {
        if (!triggerDetails) return;
        dispatch(
            rulesActions.updateTrigger({
                triggerUuid: triggerDetails.uuid,
                trigger: {
                    ignoreTrigger: true,
                    description: triggerDetails.description || '',
                    rulesUuids: triggerDetails?.rules.map((rule) => rule.uuid) || [],
                    resource: triggerDetails.resource,
                    type: triggerDetails.type,
                    actionsUuids: [],
                    event: triggerDetails.event,
                },
            }),
        );
        setConfirmIgnoreTrigger(false);
    }, [dispatch, triggerDetails]);

    const onUpdateDescriptionConfirmed = useCallback(() => {
        if (!id || !triggerDetails || !updateDescriptionEditEnable) return;

        if (updatedDescription !== triggerDetails.description) {
            dispatch(
                rulesActions.updateTrigger({
                    triggerUuid: id,
                    trigger: {
                        description: updatedDescription,
                        ignoreTrigger: triggerDetails.ignoreTrigger,
                        resource: triggerDetails.resource,
                        type: triggerDetails.type,
                        actionsUuids: triggerDetails?.actions.map((action) => action.uuid) || [],
                        rulesUuids: triggerDetails?.rules.map((rule) => rule.uuid) || [],
                        event: triggerDetails.event,
                    },
                }),
            );
        }
        setUpdateDescription(false);
    }, [dispatch, id, triggerDetails, updatedDescription, updateDescriptionEditEnable]);

    const onUpdateActionsConfirmed = useCallback(
        (newValues: SelectChangeValue[]) => {
            if (!id || !triggerDetails) return;

            const newActionsUuids = newValues.map((newAction) => newAction.value);

            const previousAndNewActionsUuid = triggerDetails?.actions.map((action) => action.uuid);
            const allActionsUuids = [...(previousAndNewActionsUuid || []), ...newActionsUuids];
            dispatch(
                rulesActions.updateTrigger({
                    triggerUuid: id,
                    trigger: {
                        actionsUuids: allActionsUuids,
                        ignoreTrigger: false,
                        resource: triggerDetails.resource,
                        type: triggerDetails.type,
                        rulesUuids: triggerDetails?.rules.map((rule) => rule.uuid) || [],
                        description: triggerDetails.description || '',
                        event: triggerDetails.event,
                    },
                }),
            );
        },
        [dispatch, id, triggerDetails],
    );

    const onUpdateRulesConfirmed = useCallback(
        (newValues: SelectChangeValue[]) => {
            if (!id || !triggerDetails) return;

            const newRulesUuids = newValues.map((newRule) => newRule.value);

            const previousAndNewRulesUuid = triggerDetails?.rules.map((rule) => rule.uuid);
            const allRules = [...(previousAndNewRulesUuid || []), ...newRulesUuids];

            dispatch(
                rulesActions.updateTrigger({
                    triggerUuid: id,
                    trigger: {
                        rulesUuids: allRules,
                        ignoreTrigger: triggerDetails.ignoreTrigger,
                        resource: triggerDetails.resource,
                        type: triggerDetails.type,
                        actionsUuids: triggerDetails?.actions.map((action) => action.uuid) || [],
                        description: triggerDetails.description || '',
                        event: triggerDetails.event,
                    },
                }),
            );
        },
        [dispatch, id, triggerDetails],
    );

    const onDeleteAction = useCallback(
        (actionUuid: string) => {
            if (!id || !triggerDetails) return;

            const updatedActionsUuid = triggerDetails?.actions.filter((action) => action.uuid !== actionUuid).map((action) => action.uuid);
            dispatch(
                rulesActions.updateTrigger({
                    triggerUuid: id,
                    trigger: {
                        description: triggerDetails?.description || '',
                        rulesUuids: triggerDetails?.rules.map((rule) => rule.uuid) || [],
                        ignoreTrigger: triggerDetails.ignoreTrigger,
                        resource: triggerDetails.resource,
                        type: triggerDetails.type,
                        actionsUuids: updatedActionsUuid,
                        event: triggerDetails.event,
                    },
                }),
            );
        },
        [dispatch, id, triggerDetails],
    );

    const onDeleteRule = useCallback(
        (ruleUuid: string) => {
            if (!id || !triggerDetails) return;

            const updatedRules = triggerDetails?.rules.filter((rule) => rule.uuid !== ruleUuid).map((rule) => rule.uuid);

            dispatch(
                rulesActions.updateTrigger({
                    triggerUuid: id,
                    trigger: {
                        rulesUuids: updatedRules,
                        description: triggerDetails.description || '',
                        ignoreTrigger: triggerDetails.ignoreTrigger,
                        resource: triggerDetails.resource,
                        type: triggerDetails.type,
                        actionsUuids: triggerDetails?.actions.map((action) => action.uuid) || [],
                        event: triggerDetails.event,
                    },
                }),
            );
        },
        [dispatch, id, triggerDetails],
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

    const triggerDetailHeader: TableHeader[] = useMemo(
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

    const triggerDetailsData: TableDataRow[] = useMemo(
        () =>
            !triggerDetails || isFetchingTriggerDetail
                ? []
                : [
                      {
                          id: 'uuid',
                          columns: ['UUID', triggerDetails.uuid, ''],
                      },
                      {
                          id: 'name',
                          columns: ['Name', triggerDetails.name, ''],
                      },
                      {
                          id: 'ignoreTrigger',
                          columns: [
                              'Ignore Trigger',
                              <Switch
                                  key="ignoreTrigger"
                                  id="ignoreTrigger"
                                  checked={triggerDetails.ignoreTrigger}
                                  onChange={(checked) => {
                                      if (checked) {
                                          setConfirmIgnoreTrigger(true);
                                      } else {
                                          dispatch(alertActions.info('Please add actions from the actions table'));
                                          triggerHighlight();
                                      }
                                  }}
                              />,
                              '',
                          ],
                      },
                      {
                          id: 'triggerType',
                          columns: ['Trigger Type', getEnumLabel(triggerTypeEnum, triggerDetails.type ?? ''), ''],
                      },
                      {
                          id: 'eventName',
                          columns: ['Event Name', getEnumLabel(eventNameEnum, triggerDetails.event ?? ''), ''],
                      },
                      {
                          id: 'resource',
                          columns: ['Resource', getEnumLabel(resourceTypeEnum, triggerDetails.resource), ''],
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
                                  (triggerDetails.description ?? '')
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
                                                  isUpdatingTrigger ||
                                                  updatedDescription === triggerDetails.description ||
                                                  updatedDescription === ''
                                              }
                                          >
                                              <Check size={16} />
                                          </Button>
                                          <Button
                                              variant="transparent"
                                              color="danger"
                                              title="Cancel"
                                              disabled={isUpdatingTrigger}
                                              onClick={() => {
                                                  setUpdateDescription(false);
                                                  setUpdatedDescription(triggerDetails?.description || '');
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
            triggerTypeEnum,
            triggerDetails,
            resourceTypeEnum,
            onUpdateDescriptionConfirmed,
            updateDescriptionEditEnable,
            isUpdatingTrigger,
            updatedDescription,
            eventNameEnum,
            dispatch,
            isFetchingTriggerDetail,
            triggerHighlight,
        ],
    );

    const actionsDataHeader = useMemo(
        () => [
            {
                id: 'name',
                content: 'Name',
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

    const actionsData: TableDataRow[] = useMemo(() => {
        const isDeleteDisabled = triggerDetails?.actions?.length === 1 || isUpdatingTrigger || isFetchingTriggerDetail;

        const actionsData = !triggerDetails?.actions.length
            ? []
            : triggerDetails?.actions.map((action) => {
                  return {
                      id: action.uuid,
                      columns: [
                          <Link to={`../../actions/detail/${action.uuid}`}>{action.name}</Link>,
                          action.description || '',
                          <Button
                              variant="transparent"
                              color="danger"
                              title={
                                  isDeleteDisabled
                                      ? 'Cannot delete this action as there are no other actions in the trigger'
                                      : 'Delete Action'
                              }
                              onClick={() => {
                                  onDeleteAction(action.uuid);
                              }}
                              disabled={isDeleteDisabled}
                          >
                              <Trash2 size={16} />
                          </Button>,
                      ],
                  };
              });

        return actionsData;
    }, [triggerDetails, onDeleteAction, isUpdatingTrigger, isFetchingTriggerDetail]);

    const rulesHeader: TableHeader[] = useMemo(
        () => [
            {
                id: 'name',
                content: 'Name',
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

    const rulesData: TableDataRow[] = useMemo(
        () =>
            !triggerDetails?.rules.length
                ? []
                : triggerDetails?.rules.map((rule, i) => {
                      return {
                          id: rule.uuid,
                          columns: [
                              <Link to={`../../rules/detail/${rule.uuid}`}>{rule.name}</Link>,
                              rule.description || '',
                              <Button
                                  variant="transparent"
                                  color="danger"
                                  title="Delete Rule"
                                  onClick={() => {
                                      onDeleteRule(rule.uuid);
                                  }}
                                  disabled={isUpdatingTrigger}
                              >
                                  <Trash2 size={16} />
                              </Button>,
                          ],
                      };
                  }),
        [triggerDetails, isUpdatingTrigger, onDeleteRule],
    );

    if (isFetchingTriggerDetail) {
        return <DetailPageSkeleton layout="tabs" tabCount={2} />;
    }

    return (
        <div>
            <Breadcrumb
                items={[
                    { label: `${getEnumLabel(resourceEnum, Resource.Triggers)} Inventory`, href: '/triggers' },
                    { label: triggerDetails?.name || 'Trigger Details', href: '' },
                ]}
            />
            <TabLayout
                tabs={[
                    {
                        title: 'Trigger Details',
                        content: (
                            <Widget noBorder>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Widget
                                            refreshAction={getFreshDetails}
                                            busy={isBusy}
                                            title="Trigger Details"
                                            titleSize="large"
                                            widgetButtons={buttons}
                                        >
                                            <CustomTable data={triggerDetailsData} headers={triggerDetailHeader} />
                                        </Widget>
                                    </div>
                                    <div>
                                        <Widget
                                            busy={isBusy}
                                            title="Actions"
                                            titleSize="large"
                                            widgetInfoCard={{
                                                title: 'Information',
                                                description: 'Actions is named set of actions for selected trigger',
                                            }}
                                        >
                                            <CustomTable
                                                data={actionsData}
                                                headers={actionsDataHeader}
                                                newRowWidgetProps={{
                                                    isBusy: isUpdatingTrigger,
                                                    newItemsList: actionsOptions,
                                                    onAddClick: onUpdateActionsConfirmed,
                                                }}
                                            />
                                        </Widget>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <div>
                                        <Widget busy={isBusy} title="Rules" titleSize="large">
                                            <CustomTable
                                                data={rulesData}
                                                headers={rulesHeader}
                                                newRowWidgetProps={{
                                                    isBusy: isUpdatingTrigger,
                                                    newItemsList: rulesOptions,
                                                    onAddClick: onUpdateRulesConfirmed,
                                                }}
                                            />
                                        </Widget>
                                    </div>
                                </div>
                            </Widget>
                        ),
                    },
                    {
                        title: 'Flow',
                        content: (
                            <FlowChart
                                busy={isBusy}
                                flowChartTitle="Trigger Flow"
                                flowChartEdges={edges}
                                flowChartNodes={nodes}
                                defaultViewport={defaultViewport}
                                flowDirection="STAR"
                                legends={[
                                    {
                                        color: '#afbbdb',
                                        icon: 'fa fa-rocket',
                                        label: 'Trigger',
                                    },
                                    {
                                        color: '#1ab394e1',
                                        icon: 'fa fa-bolt',
                                        label: 'Action',
                                    },

                                    {
                                        color: '#2798E7',
                                        icon: 'fa fa-book',
                                        label: 'Rule',
                                    },
                                ]}
                            />
                        ),
                    },
                ]}
            />

            <Dialog
                isOpen={confirmDelete}
                caption={`Delete a Trigger`}
                body={`You are about to delete a Trigger. Is this what you want to do?`}
                toggle={() => setConfirmDelete(false)}
                icon="delete"
                buttons={[
                    { color: 'danger', onClick: onDeleteConfirmed, body: 'Delete' },
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmDelete(false), body: 'Cancel' },
                ]}
            />

            <Dialog
                isOpen={confirmIgnoreTrigger}
                caption={`Ignore Trigger`}
                body={`You are about to mark this trigger as ignore trigger. This will remove all actions from the trigger. Is this what you want to do?`}
                toggle={() => setConfirmIgnoreTrigger(false)}
                buttons={[
                    { color: 'warning', onClick: onIgnoreTriggerConfirmed, body: 'Ignore & remove actions' },
                    { color: 'secondary', variant: 'outline', onClick: () => setConfirmIgnoreTrigger(false), body: 'Cancel' },
                ]}
            />
        </div>
    );
};

export default TriggerDetails;
