import TabLayout from 'components/Layout/TabLayout';
import { selectors as profileApprovalSelectors } from 'ducks/approval-profiles';
import { actions as groupAction, selectors as groupSelectors } from 'ducks/certificateGroups';
import { actions as rolesActions, selectors as rolesSelectors } from 'ducks/roles';
import { actions as userAction, selectors as userSelectors } from 'ducks/users';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router';
import Select from 'components/Select';
import TextInput from 'components/TextInput';
import { type ApprovalStepRequestModel, ApproverType, type ProfileApprovalRequestModel } from 'types/approval-profiles';
import { validateLength, validateNonZeroInteger, validatePositiveInteger, validateRequired } from 'utils/validators';
import { buildValidationRules, getFieldErrorMessage } from 'utils/validators-helper';
import { Plus, X } from 'lucide-react';

type Props = {
    approvalSteps: ApprovalStepRequestModel[];
    inProgress: boolean;
    onCancelClick: () => void;
};

type SelectOptionApprover = { label: string; value: string } | null;
type SelectOptionApproverType = { label: string; value: string };

const approverTypeOptions = Object.values(ApproverType).map((type) => ({
    value: type.toLocaleLowerCase() + 'Uuid',
    label: type,
}));

export default function ApprovalStepField({ approvalSteps }: Readonly<Props>) {
    const { control, setValue } = useFormContext<ProfileApprovalRequestModel>();
    const [selectedApprovalTypeList, setselectedApprovalTypeList] = useState<SelectOptionApproverType[] | undefined>(undefined);
    const [selectedApproverList, setSelectedApproverList] = useState<SelectOptionApprover[]>([]);
    const profileApprovalDetail = useSelector(profileApprovalSelectors.profileApprovalDetail);
    const dispatch = useDispatch();
    const users = useSelector(userSelectors.users);
    const roles = useSelector(rolesSelectors.roles);
    const groups = useSelector(groupSelectors.certificateGroups);
    const { id } = useParams();
    const editMode = useMemo(() => !!id, [id]);
    const [selectedTab, setSelectedTab] = useState<number>(0);

    useEffect(() => {
        dispatch(userAction.list());
    }, [dispatch]);

    useEffect(() => {
        dispatch(groupAction.listGroups());
    }, [dispatch]);

    useEffect(() => {
        dispatch(rolesActions.list());
    }, [dispatch]);

    const updateAppoverAfterRemove = useCallback(
        (index: number) => {
            const newSelectedApprovalTypeList = selectedApprovalTypeList?.filter((_, i) => i !== index);
            setselectedApprovalTypeList(newSelectedApprovalTypeList);

            const newSelectedApproverList = selectedApproverList?.filter((_, i) => i !== index);
            setSelectedApproverList(newSelectedApproverList);
        },
        [selectedApprovalTypeList, selectedApproverList],
    );

    useEffect(() => {
        if (editMode && profileApprovalDetail?.approvalSteps.length) {
            const newSelectedApprovalTypeList: SelectOptionApproverType[] = profileApprovalDetail?.approvalSteps.map((step) => {
                if (step.userUuid) {
                    return { label: ApproverType.User, value: ApproverType.User.toLocaleLowerCase() + 'Uuid' };
                }
                if (step.groupUuid) {
                    return { label: ApproverType.Group, value: ApproverType.Group.toLocaleLowerCase() + 'Uuid' };
                }
                if (step.roleUuid) {
                    return { label: ApproverType.Role, value: ApproverType.Role.toLocaleLowerCase() + 'Uuid' };
                }
                return { label: '', value: '' };
            });
            setselectedApprovalTypeList(newSelectedApprovalTypeList);

            const newSelectedApproverList: SelectOptionApprover[] = profileApprovalDetail?.approvalSteps.map((step) => {
                if (step.userUuid) {
                    return { label: users.find((user) => user.uuid === step.userUuid)?.username ?? '', value: step.userUuid };
                }
                if (step.groupUuid) {
                    return { label: groups.find((group) => group.uuid === step.groupUuid)?.name ?? '', value: step.groupUuid };
                }
                if (step.roleUuid) {
                    return { label: roles.find((role) => role.uuid === step.roleUuid)?.name ?? '', value: step.roleUuid };
                }
                return null;
            });

            setSelectedApproverList(newSelectedApproverList);
        }
    }, [profileApprovalDetail, editMode, users, roles, groups, setSelectedApproverList, setselectedApprovalTypeList]);

    const resetFormUuids = useCallback(
        (index: number) => {
            setValue(`approvalSteps.${index}.userUuid`, undefined);
            setValue(`approvalSteps.${index}.groupUuid`, undefined);
            setValue(`approvalSteps.${index}.roleUuid`, undefined);
        },
        [setValue],
    );

    const handleApprovalTypeChange = useCallback(
        (e: SelectOptionApprover, index: number) => {
            if (!e || e.value === selectedApprovalTypeList?.[index]?.value) return;

            const newSelectedApprovalTypeList = [...(selectedApprovalTypeList ?? [])];
            newSelectedApprovalTypeList[index] = e;
            setselectedApprovalTypeList(newSelectedApprovalTypeList);

            const newSelectedApproverList = [...(selectedApproverList ?? [])];
            newSelectedApproverList[index] = null;
            setSelectedApproverList(newSelectedApproverList);

            resetFormUuids(index);

            if (e.label === ApproverType.User) {
                setValue(`approvalSteps.${index}.requiredApprovals`, 1);
            }
        },
        [selectedApprovalTypeList, selectedApproverList, setValue, resetFormUuids],
    );

    const handleApproverChange = useCallback(
        (e: SelectOptionApprover, index: number) => {
            if (!e || !selectedApprovalTypeList || e.value === selectedApproverList?.[index]?.value) return;

            resetFormUuids(index);
            setValue(`approvalSteps.${index}.${selectedApprovalTypeList[index].value}` as any, e.value);

            setSelectedApproverList((prevList) => {
                const newList = [...(prevList ?? [])];
                newList[index] = e;
                return newList;
            });
        },
        [selectedApprovalTypeList, selectedApproverList, setValue, resetFormUuids],
    );

    const getApproverOptions = useCallback(
        (approverType: string) => {
            if (approverType === ApproverType.User) {
                return users.map((user) => ({
                    value: user.uuid,
                    label: user.username,
                }));
            }

            if (approverType === ApproverType.Role) {
                return roles.map((role) => ({
                    value: role.uuid,
                    label: role.name,
                }));
            }

            if (approverType === ApproverType.Group) {
                return groups.map((group) => ({
                    value: group.uuid,
                    label: group.name,
                }));
            }

            return [];
        },
        [users, roles, groups],
    );

    const handleApproverSelectChange = useCallback(
        (index: number, fieldOnChange: (v: any) => void) => (value: any) => {
            fieldOnChange(value);
            const label = selectedApprovalTypeList?.[index]?.label;
            if (!label) return;
            const option = getApproverOptions(label).find((opt) => opt.value === value);
            if (option) handleApproverChange(option, index);
        },
        [selectedApprovalTypeList, getApproverOptions, handleApproverChange],
    );

    const handleAddStepClick = (): void => {
        const newStep: ApprovalStepRequestModel = {
            order: approvalSteps.length + 1,
        };
        const newApprovalSteps = [...approvalSteps, newStep];
        setValue('approvalSteps', newApprovalSteps);
        setSelectedTab(newApprovalSteps.length - 1);
    };

    const handleRemoveStepClick = useCallback(
        (index: number): void => {
            if (approvalSteps.length === 1) return;

            const newApprovalSteps = approvalSteps.filter((step, i) => i !== index);
            const orderedApprovalSteps = newApprovalSteps.map((step, i) => ({ ...step, order: i + 1 }));

            setValue('approvalSteps', orderedApprovalSteps);
            updateAppoverAfterRemove(index);

            if (selectedTab === approvalSteps.length - 1) {
                setSelectedTab(selectedTab - 1);
            }
        },
        [approvalSteps, setValue, selectedTab, updateAppoverAfterRemove],
    );

    const renderApprovalSteps = useCallback(
        (index: number) => {
            return (
                <div key={index} className="space-y-4">
                    <Controller
                        name={`approvalSteps.${index}.description`}
                        control={control}
                        rules={buildValidationRules([validateLength(0, 300)])}
                        render={({ field, fieldState }) => (
                            <TextInput
                                value={field.value}
                                onChange={(value) => field.onChange(value)}
                                onBlur={field.onBlur}
                                id={`stepDescription-${index}`}
                                type="text"
                                placeholder="Enter Description"
                                label="Description"
                                invalid={fieldState.error && fieldState.isTouched}
                                error={getFieldErrorMessage(fieldState)}
                            />
                        )}
                    />
                    <Select
                        id={`approverTypeSelect-${index}`}
                        value={selectedApprovalTypeList?.[index]?.value || ''}
                        onChange={(value) => {
                            const option = approverTypeOptions.find((opt) => opt.value === value);
                            if (option) {
                                handleApprovalTypeChange({ value: option.value, label: option.label }, index);
                            }
                        }}
                        options={approverTypeOptions.map((opt) => ({ value: opt.value, label: opt.label }))}
                        placeholder="Select Approver Type"
                        placement="bottom"
                        label="Approver Type"
                    />
                    <div className="space-y-4">
                        <Controller
                            name={`approvalSteps.${index}.requiredApprovals`}
                            control={control}
                            rules={buildValidationRules([validateRequired(), validatePositiveInteger(), validateNonZeroInteger()])}
                            render={({ field, fieldState }) => (
                                <TextInput
                                    value={field.value === undefined ? '' : field.value.toString()}
                                    onChange={(value) => field.onChange(value ? Number.parseInt(value, 10) : undefined)}
                                    onBlur={field.onBlur}
                                    id={`requiredApprovals-${index}`}
                                    type="number"
                                    placeholder="Enter Required Approvals"
                                    label="Required Approvals"
                                    disabled={selectedApprovalTypeList && selectedApprovalTypeList[index]?.label === ApproverType.User}
                                    invalid={fieldState.error && fieldState.isTouched}
                                    error={getFieldErrorMessage(fieldState)}
                                />
                            )}
                        />
                        <div>
                            {selectedApprovalTypeList?.[index]?.label && (
                                <Controller
                                    name={`approvalSteps.${index}.${selectedApprovalTypeList[index].value}` as any}
                                    control={control}
                                    rules={buildValidationRules([validateRequired()])}
                                    render={({ field, fieldState }) => (
                                        <>
                                            <Select
                                                id={`approverSelect-${index}`}
                                                value={field.value || ''}
                                                label={`Select ${selectedApprovalTypeList[index].label}`}
                                                required
                                                onChange={handleApproverSelectChange(index, field.onChange)}
                                                options={getApproverOptions(selectedApprovalTypeList[index].label)}
                                                placeholder="Select Approver"
                                                placement="bottom"
                                            />
                                            {fieldState.error && fieldState.isTouched && (
                                                <p className="mt-1 text-sm text-red-600">
                                                    {typeof fieldState.error === 'string'
                                                        ? fieldState.error
                                                        : fieldState.error?.message || 'Invalid value'}
                                                </p>
                                            )}
                                        </>
                                    )}
                                />
                            )}
                        </div>
                    </div>
                </div>
            );
        },
        [selectedApprovalTypeList, handleApprovalTypeChange, handleApproverSelectChange, getApproverOptions, control],
    );

    const tabs = useMemo(
        () =>
            approvalSteps.map((approvalStep, index) => ({
                title: (
                    <div className="flex items-center justify-center gap-2">
                        Approval Step {index + 1}
                        {/* biome-ignore lint/a11y/useSemanticElements: can't be a <button> — the tab title renders inside RadixTabs.Trigger's own <button>, and nested buttons are invalid HTML; role="button" with key handling keeps it accessible. */}
                        <div
                            onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveStepClick(index);
                            }}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.stopPropagation();
                                    handleRemoveStepClick(index);
                                }
                            }}
                            aria-label={`Remove approval step ${index + 1}`}
                        >
                            <X size={16} color="currentColor" />
                        </div>
                    </div>
                ),
                content: renderApprovalSteps(index),
                onClick: () => setSelectedTab(index),
            })),
        [approvalSteps, renderApprovalSteps, handleRemoveStepClick],
    );

    return (
        <TabLayout
            noBorder
            tabs={[
                ...tabs,
                {
                    title: <Plus size={16} onClick={() => handleAddStepClick()} />,
                    content: <></>,
                    onClick: () => handleAddStepClick(),
                },
            ]}
            selectedTab={selectedTab}
        />
    );
}
