import Widget from 'components/Widget';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Select from 'components/Select';
import Button from 'components/Button';
import Label from 'components/Label';
import { type ComplianceProfileDtoV2, type ComplianceRuleListDto, FunctionGroupCode, PlatformEnum, type Resource } from 'types/openapi';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router';
import { actions, selectors, actions as complianceActions } from 'ducks/compliance-profiles';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { actions as connectorsActions, selectors as connectorsSelectors } from 'ducks/connectors';
import CustomTable from 'components/CustomTable';
import Container from 'components/Container';
import {
    getAssignedInternalListOfGroupsAndRules,
    getAssignedProviderListOfGroupsAndRules,
    getRulesAndGroupsTableHeaders,
    formatAvailableRulesAndGroups,
    getListOfResources,
    rulesSourceOptions,
    getTypeTableColumn,
} from 'utils/compliance-profile';
import WidgetButtons from 'components/WidgetButtons';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import { ResourceBadges } from 'components/_pages/compliance-profiles/detail/Components/ResourceBadges';
import Dialog from 'components/Dialog';
import AttributeEditor from 'components/Attributes/AttributeEditor';
import { FormProvider, useForm } from 'react-hook-form';
import ProgressButton from 'components/ProgressButton';
import { Plus } from 'lucide-react';
import { collectFormAttributes } from 'utils/attributes/attributes';
import type { AttributeDescriptorModel, AttributeRequestModel } from 'types/attributes';
import InternalRuleForm from 'components/_pages/compliance-profiles/detail/InternalRuleForm/InternalRuleForm';
import { LockWidgetNameEnum } from 'types/user-interface';
import type { TRuleGroupType } from 'types/complianceProfiles';

const AttributeEditorDialogBody = ({
    isAssigningRule,
    onSubmit,
    onCancel,
}: {
    isAssigningRule: TRuleGroupType | null;
    onSubmit: (values: any) => void;
    onCancel: () => void;
}) => {
    const methods = useForm({
        mode: 'onTouched',
        defaultValues: {},
    });

    const { handleSubmit, formState } = methods;

    return (
        <div data-testid="attribute-editor-dialog">
            <FormProvider {...methods}>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="space-y-4">
                        <AttributeEditor
                            id="rule-attributes"
                            attributeDescriptors={(isAssigningRule?.attributes ?? []) as AttributeDescriptorModel[]}
                        />
                        <Container className="flex-row justify-end modal-footer" gap={4}>
                            <ProgressButton
                                title={'Add rule'}
                                inProgressTitle={'Adding...'}
                                inProgress={formState.isSubmitting}
                                disabled={!formState.isDirty || formState.isSubmitting || !formState.isValid}
                            />
                            <Button color="secondary" onClick={onCancel} disabled={formState.isSubmitting}>
                                Cancel
                            </Button>
                        </Container>
                    </div>
                </form>
            </FormProvider>
        </div>
    );
};

type Props = Readonly<{
    profile: ComplianceProfileDtoV2 | undefined;
    setSelectedEntityDetails: (entityDetails: any) => void;
    setIsEntityDetailMenuOpen: (isEntityDetailMenuOpen: boolean) => void;
    onReset?: (resetFn: () => void) => void;
}>;

export default function AvailableRulesAndGroups({ profile, setSelectedEntityDetails, setIsEntityDetailMenuOpen, onReset }: Props) {
    const { id } = useParams();
    const dispatch = useDispatch();

    const isFetchingRules = useSelector(selectors.isFetchingRules);
    const isFetchingGroups = useSelector(selectors.isFetchingGroups);

    const rules = useSelector(selectors.rules);
    const groups = useSelector(selectors.groups);
    const resourceEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.Resource));
    const connectors = useSelector(connectorsSelectors.connectors);

    const [availableSelectedRulesSource, setAvailableSelectedRulesSource] = useState<'Internal' | 'Provider' | null>(null);
    const [selectedAvailableResourceType, setSelectedAvailableResourceType] = useState<string | null>('All');
    const [selectedAvailableProvider, setSelectedAvailableProvider] = useState<string | null>(null);
    const [selectedAvailableKind, setSelectedAvailableKind] = useState<string | null>(null);
    const [availableProviderOptions, setAvailableProviderOptions] = useState<{ label: string; value: string }[]>([]);
    const [availableKindOptions, setAvailableKindOptions] = useState<{ label: string; value: string }[]>([]);
    const [availableRulesAndGroupsResources, setAvailableRulesAndGroupsResources] = useState<(Resource | 'All')[]>(['All']);
    const [filteredAvailableRulesAndGroupsList, setFilteredAvailableRulesAndGroupsList] = useState<TRuleGroupType[]>([]);
    const [alreadyAssignedRulesandGroupUuidList, setAlreadyAssignedRulesandGroupUuidList] = useState<string[]>([]);
    const [isAddingRuleHasAttribute, setIsAddingRuleHasAttribute] = useState(false);
    const [isAssigningRule, setIsAssigningRule] = useState<TRuleGroupType | null>(null);
    const [isAddingInternalRule, setIsAddingInternalRule] = useState(false);
    const [deletingInternalRuleId, setDeletingInternalRuleId] = useState<string | null>(null);
    const [editingInternalRule, setEditingInternalRule] = useState<TRuleGroupType | null>(null);

    const handleClearInput = useCallback(() => {
        dispatch(complianceActions.clearRules());
        dispatch(complianceActions.clearGroups());
    }, [dispatch]);

    const resetSelectValues = useCallback(() => {
        setAvailableSelectedRulesSource(null);
        setSelectedAvailableResourceType('All');
        setSelectedAvailableProvider(null);
        setSelectedAvailableKind(null);
        handleClearInput();
    }, [handleClearInput]);

    // Expose reset function to parent component
    useEffect(() => {
        if (onReset) {
            onReset(resetSelectValues);
        }
    }, [onReset, resetSelectValues]);

    //get internal rules or provider data
    useEffect(() => {
        if (availableSelectedRulesSource === 'Internal') {
            dispatch(actions.getListComplianceRules({}));
        }
        if (availableSelectedRulesSource === 'Provider') {
            dispatch(connectorsActions.listConnectorsMerge({ functionGroup: FunctionGroupCode.ComplianceProvider }));
            dispatch(connectorsActions.listConnectorsMerge({ functionGroup: FunctionGroupCode.ComplianceProviderV2 }));
        }
    }, [availableSelectedRulesSource, dispatch]);

    //get provider options
    useEffect(() => {
        if (availableSelectedRulesSource === 'Provider' && connectors.length > 0) {
            setAvailableProviderOptions(connectors.map((connector) => ({ label: connector.name, value: connector.uuid })));
        }
    }, [availableSelectedRulesSource, connectors]);

    //get kind options
    useEffect(() => {
        if (availableSelectedRulesSource === 'Provider' && selectedAvailableProvider && connectors.length > 0) {
            const allKinds = (connectors.find((connector) => connector.uuid === selectedAvailableProvider)?.functionGroups ?? []).flatMap(
                (fg) => fg.kinds || [],
            );
            const kindOptions = Array.from(new Set(allKinds)).map((kind) => ({ label: kind, value: kind }));
            setAvailableKindOptions(kindOptions);
        }
    }, [availableSelectedRulesSource, connectors, selectedAvailableProvider]);

    //get provider rules and groups
    useEffect(() => {
        if (availableSelectedRulesSource === 'Provider' && selectedAvailableProvider && selectedAvailableKind) {
            dispatch(
                actions.getListComplianceRules({
                    connectorUuid: selectedAvailableProvider,
                    kind: selectedAvailableKind,
                }),
            );
            dispatch(
                actions.getListComplianceGroups({
                    connectorUuid: selectedAvailableProvider,
                    kind: selectedAvailableKind,
                }),
            );
        }
    }, [availableSelectedRulesSource, selectedAvailableProvider, selectedAvailableKind, dispatch]);

    //get already assigned rules and groups uuid list
    useEffect(() => {
        const alreadyAssignedRulesandGroups = [
            ...getAssignedInternalListOfGroupsAndRules(profile),
            ...getAssignedProviderListOfGroupsAndRules(profile),
        ];
        setAlreadyAssignedRulesandGroupUuidList(alreadyAssignedRulesandGroups.map((ruleOrGroup) => ruleOrGroup.uuid));
    }, [profile]);

    const getAvailableRulesAndGroupsWithoutAlreadyAssigned = useCallback(() => {
        if (!groups || !rules) return [];
        const withoutAssignedRulesandGroups = [
            ...formatAvailableRulesAndGroups('group', groups),
            ...formatAvailableRulesAndGroups('rule', rules),
        ].filter((ruleOrGroup) => !alreadyAssignedRulesandGroupUuidList.includes(ruleOrGroup.uuid));
        return withoutAssignedRulesandGroups as TRuleGroupType[];
    }, [groups, rules, alreadyAssignedRulesandGroupUuidList]);

    //get initial available rules and groups list
    useEffect(() => {
        const withoutAssignedRulesandGroups = getAvailableRulesAndGroupsWithoutAlreadyAssigned();
        setFilteredAvailableRulesAndGroupsList(withoutAssignedRulesandGroups);
        setAvailableRulesAndGroupsResources(getListOfResources(withoutAssignedRulesandGroups) as (Resource | 'All')[]);
    }, [alreadyAssignedRulesandGroupUuidList, getAvailableRulesAndGroupsWithoutAlreadyAssigned]);

    //get filtered by resource type
    useEffect(() => {
        const filtered = getAvailableRulesAndGroupsWithoutAlreadyAssigned().filter((ruleOrGroup) =>
            selectedAvailableResourceType === 'All' ? true : ruleOrGroup.resource === selectedAvailableResourceType,
        );
        setFilteredAvailableRulesAndGroupsList(filtered);
    }, [getAvailableRulesAndGroupsWithoutAlreadyAssigned, selectedAvailableResourceType]);

    const onRuleAssign = useCallback(
        (ruleOrGroup: TRuleGroupType) => {
            if (!id) return;
            if (ruleOrGroup?.attributes?.length && ruleOrGroup?.attributes?.length > 0) {
                setIsAddingRuleHasAttribute(true);
                setIsAssigningRule(ruleOrGroup);
            } else {
                const rulePayload = {
                    uuid: id,
                    complianceProfileRulesPatchRequestDto: {
                        removal: false,
                        ruleUuid: ruleOrGroup.uuid,
                        connectorUuid: ruleOrGroup?.connectorUuid ?? undefined,
                        kind: ruleOrGroup?.kind ?? undefined,
                        attributes: (ruleOrGroup?.attributes as AttributeRequestModel[]) ?? undefined,
                    },
                };
                dispatch(actions.updateRule(rulePayload));
            }
        },
        [dispatch, id],
    );

    const onGroupAssign = useCallback(
        (ruleOrGroup: TRuleGroupType) => {
            if (!id) return;
            const groupPayload = {
                uuid: id,
                complianceProfileGroupsPatchRequestDto: {
                    removal: false,
                    groupUuid: ruleOrGroup.uuid,
                    connectorUuid: ruleOrGroup.connectorUuid!,
                    kind: ruleOrGroup.kind!,
                },
            };
            dispatch(actions.updateGroup(groupPayload));
        },
        [dispatch, id],
    );

    const deleteInternalRule = useCallback(
        (id: string) => {
            if (!id) return;
            dispatch(actions.deleteComplienceInternalRule({ internalRuleUuid: id }));
            setDeletingInternalRuleId(null);
        },
        [dispatch],
    );

    const tableHeadersAvailableRulesAndGroups = useMemo(() => {
        return getRulesAndGroupsTableHeaders('available');
    }, []);

    const tableDataAvailableRulesAndGroups = useMemo(
        () =>
            filteredAvailableRulesAndGroupsList.map((ruleOrGroup) => {
                return {
                    id: ruleOrGroup.uuid,
                    columns: [
                        getTypeTableColumn(ruleOrGroup, setSelectedEntityDetails, setIsEntityDetailMenuOpen),
                        ruleOrGroup.name,
                        getEnumLabel(resourceEnum, ruleOrGroup.resource),
                        <WidgetButtons
                            key={ruleOrGroup.uuid}
                            justify="start"
                            buttons={[
                                {
                                    id: 'add',
                                    icon: 'plus',
                                    disabled: false,
                                    tooltip: 'Add',
                                    onClick: () => {
                                        if (ruleOrGroup.entityDetails?.entityType === 'rule') {
                                            onRuleAssign(ruleOrGroup);
                                        }
                                        if (ruleOrGroup.entityDetails?.entityType === 'group') {
                                            onGroupAssign(ruleOrGroup);
                                        }
                                    },
                                },
                                ...(availableSelectedRulesSource === 'Internal'
                                    ? ([
                                          {
                                              id: 'delete',
                                              icon: 'trash',
                                              disabled: false,
                                              tooltip: 'Delete',
                                              onClick: () => {
                                                  setDeletingInternalRuleId(ruleOrGroup.uuid);
                                              },
                                          },
                                          {
                                              id: 'edit',
                                              icon: 'pencil',
                                              disabled: false,
                                              tooltip: 'Edit',
                                              onClick: () => {
                                                  setEditingInternalRule(ruleOrGroup);
                                              },
                                          },
                                      ] as WidgetButtonProps[])
                                    : ([] as WidgetButtonProps[])),
                            ]}
                        />,
                    ],
                };
            }),

        [
            filteredAvailableRulesAndGroupsList,
            resourceEnum,
            availableSelectedRulesSource,
            setSelectedEntityDetails,
            setIsEntityDetailMenuOpen,
            onRuleAssign,
            onGroupAssign,
        ],
    );

    const onSubmit = useCallback(
        (values: any) => {
            if (!isAssigningRule || !id) return;
            const attributes = collectFormAttributes(
                'rule-attributes',
                (isAssigningRule?.attributes ?? []) as AttributeDescriptorModel[],
                values,
            );
            const rulePayload = {
                uuid: id,
                complianceProfileRulesPatchRequestDto: {
                    removal: false,
                    ruleUuid: isAssigningRule.uuid,
                    connectorUuid: isAssigningRule?.connectorUuid ?? undefined,
                    kind: isAssigningRule?.kind ?? undefined,
                    attributes: attributes,
                },
            };
            dispatch(actions.updateRule(rulePayload));
            setIsAddingRuleHasAttribute(false);
            setIsAssigningRule(null);
        },
        [dispatch, id, isAssigningRule],
    );

    return (
        <div>
            <Widget
                title="Available Rules & Groups"
                titleSize="large"
                widgetLockName={LockWidgetNameEnum.ListOfAvailableRulesAndGroups}
                lockSize="large"
                dataTestId="available-rules-and-groups-widget"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="w-full">
                        <Label htmlFor="availableRulesSource">Rules Source</Label>
                        <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '10px' }}>
                            <Select
                                id="availableRulesSource"
                                placeholder="Select..."
                                options={rulesSourceOptions}
                                value={availableSelectedRulesSource || ''}
                                onChange={(value) => {
                                    setSelectedAvailableResourceType('All');
                                    handleClearInput();
                                    setAvailableSelectedRulesSource((value as 'Internal' | 'Provider') || null);
                                    setSelectedAvailableProvider(null);
                                    setSelectedAvailableKind(null);
                                }}
                                isClearable
                            />

                            {availableSelectedRulesSource === 'Internal' && (
                                <Button
                                    data-testid="add-internal-rule-button"
                                    variant="transparent"
                                    title="Add internal rule"
                                    onClick={() => setIsAddingInternalRule(true)}
                                >
                                    <Plus size={16} />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
                {availableSelectedRulesSource === 'Provider' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2.5">
                        <div>
                            <Label htmlFor="availableProvider">Provider</Label>
                            <Select
                                id="availableProvider"
                                placeholder="Select..."
                                options={availableProviderOptions}
                                value={selectedAvailableProvider || ''}
                                onChange={(value) => {
                                    setSelectedAvailableKind(null);
                                    setSelectedAvailableProvider((value as string) || null);
                                    handleClearInput();
                                }}
                                isClearable
                            />
                        </div>
                        <div>
                            <Label htmlFor="availableKind">Kind</Label>
                            <Select
                                id="availableKind"
                                placeholder="Select..."
                                options={availableKindOptions}
                                value={selectedAvailableKind || ''}
                                onChange={(value) => {
                                    if (!value) {
                                        handleClearInput();
                                        setSelectedAvailableKind(null);
                                        return;
                                    }
                                    setSelectedAvailableKind(value as string);
                                }}
                                isClearable
                            />
                        </div>
                    </div>
                )}
                <ResourceBadges
                    resources={availableRulesAndGroupsResources}
                    selected={selectedAvailableResourceType}
                    onSelect={setSelectedAvailableResourceType}
                    getLabel={(resource) => getEnumLabel(resourceEnum, resource)}
                />
                <Widget titleSize="large" busy={isFetchingRules || isFetchingGroups}>
                    <CustomTable
                        headers={tableHeadersAvailableRulesAndGroups}
                        data={tableDataAvailableRulesAndGroups}
                        hasPagination={true}
                        canSearch={true}
                    />
                </Widget>
            </Widget>
            <Dialog
                isOpen={isAddingRuleHasAttribute}
                caption="Attributes"
                body={
                    <AttributeEditorDialogBody
                        isAssigningRule={isAssigningRule}
                        onSubmit={onSubmit}
                        onCancel={() => {
                            setIsAddingRuleHasAttribute(false);
                            setIsAssigningRule(null);
                        }}
                    />
                }
                toggle={() => setIsAddingRuleHasAttribute(false)}
                buttons={[]}
                dataTestId="attribute-editor-dialog"
            />

            <Dialog
                size="xxl"
                isOpen={isAddingInternalRule}
                caption="Create Internal Rule"
                body={<InternalRuleForm onCancel={() => setIsAddingInternalRule(false)} />}
                toggle={() => setIsAddingInternalRule(false)}
                buttons={[]}
                dataTestId="create-internal-rule-dialog"
            />
            <Dialog
                size="xl"
                isOpen={editingInternalRule !== null}
                caption="Edit Internal Rule"
                body={
                    <InternalRuleForm rule={editingInternalRule as ComplianceRuleListDto} onCancel={() => setEditingInternalRule(null)} />
                }
                toggle={() => setEditingInternalRule(null)}
                buttons={[]}
                dataTestId="edit-internal-rule-dialog"
            />
            <Dialog
                isOpen={deletingInternalRuleId !== null}
                caption="Delete Internal Rule"
                body="You are about to delete an Internal Rule. Is this what you want to do?"
                toggle={() => setDeletingInternalRuleId(null)}
                icon="delete"
                buttons={[
                    { color: 'danger', onClick: () => deleteInternalRule(deletingInternalRuleId!), body: 'Delete' },
                    { color: 'secondary', variant: 'outline', onClick: () => setDeletingInternalRuleId(null), body: 'Cancel' },
                ]}
                dataTestId="delete-internal-rule-dialog"
            />
        </div>
    );
}
