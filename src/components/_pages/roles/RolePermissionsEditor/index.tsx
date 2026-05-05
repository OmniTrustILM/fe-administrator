import CustomTable, { type TableDataRow, type TableHeader } from 'components/CustomTable';

import Dialog from 'components/Dialog';
import Checkbox from 'components/Checkbox';
import Button from 'components/Button';
import SimpleBar from 'simplebar-react';
import { Plus, Trash2, Check, X } from 'lucide-react';

import { actions as authActions, selectors as authSelectors } from 'ducks/auth';
import type React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AuthResourceModel } from 'types/auth';
import type { ObjectPermissionsResponseModel, ResourcePermissionsResponseModel, SubjectPermissionsModel } from 'types/roles';
import cn from 'classnames';
import Container from 'components/Container';

type Props = Readonly<{
    submitButtonsGroup: React.ReactNode;
    resources?: AuthResourceModel[];
    permissions?: SubjectPermissionsModel;
    disabled?: boolean;
    onPermissionsChanged?: (permissions: SubjectPermissionsModel) => void;
}>;

function RolePermissionsEditor({
    submitButtonsGroup,
    resources,
    permissions = { allowAllResources: false, resources: [] },
    disabled = false,
    onPermissionsChanged,
}: Props) {
    const dispatch = useDispatch();

    const objects = useSelector(authSelectors.objects);
    const isFetchingObjects = useSelector(authSelectors.isFetchingObjects);

    const [currentResource, setCurrentResource] = useState<AuthResourceModel>();

    const [selectedObjects, setSelectedObjects] = useState<string[]>([]);
    const [objectsToAdd, setObjectsToAdd] = useState<string[]>([]);

    const [objectListDialog, setObjectListDialog] = useState<boolean>(false);

    const isBusy = isFetchingObjects;

    const getPermissions = useCallback(
        (resource: AuthResourceModel) => {
            if (permissions.allowAllResources) return 'All actions allowed';

            const perms = permissions?.resources.find((r) => r.name === resource.name);

            if (perms?.allowAllActions) return 'All actions allowed';

            const actions = perms?.actions
                .map((actionName) => resource.actions.find((el) => el.name === actionName)?.displayName)
                .filter((el) => el)
                .join(', ');

            return actions ? actions : 'No permissions assigned';
        },
        [permissions],
    );

    const clonePerms = useCallback(() => structuredClone(permissions) as SubjectPermissionsModel, [permissions]);

    const onResourceSelected = useCallback(
        (resource: AuthResourceModel) => {
            setObjectsToAdd([]);
            if (resource.listObjectsEndpoint) dispatch(authActions.getObjectsForResource({ resource: resource.name }));
            setCurrentResource(resource);
        },
        [dispatch],
    );

    const allowAllActions = useCallback(
        (resource: AuthResourceModel, enable: boolean) => {
            const newPermissions: SubjectPermissionsModel = clonePerms();

            const resourcePermissions = newPermissions.resources.find((r) => r.name === resource.name);

            if (resourcePermissions) {
                resourcePermissions.allowAllActions = enable;
                resourcePermissions.actions = enable ? currentResource?.actions.map((a) => a.name) || [] : [];
            } else {
                newPermissions.resources.push({
                    name: resource.name,
                    allowAllActions: enable,
                    actions: enable ? currentResource?.actions.map((a) => a.name) || [] : [],
                    objects: [],
                });
            }

            onPermissionsChanged?.(newPermissions);
        },
        [clonePerms, currentResource?.actions, onPermissionsChanged],
    );

    const allowAction = useCallback(
        (resource: AuthResourceModel, action: string, enable: boolean) => {
            const newPermissions: SubjectPermissionsModel = clonePerms();

            const resourcePermissions = newPermissions.resources.find((r) => r.name === resource.name);

            if (resourcePermissions) {
                if (enable) {
                    resourcePermissions.actions.push(action);
                } else {
                    resourcePermissions.actions = resourcePermissions.actions.filter((a) => a !== action);
                }
            } else {
                newPermissions.resources.push({
                    name: resource.name,
                    allowAllActions: false,
                    actions: [action],
                    objects: [],
                });
            }

            onPermissionsChanged?.(newPermissions);
        },
        [clonePerms, onPermissionsChanged],
    );

    const setExistingOLP = useCallback(
        (
            resourcePermissions: ResourcePermissionsResponseModel,
            objectUuid: string,
            objectName: string,
            action: string,
            permissions: 'allow' | 'deny',
        ) => {
            const handleExistingObjectPermissions = (objectPermissions: ObjectPermissionsResponseModel) => {
                if (permissions === 'allow') {
                    if (!objectPermissions.allow.includes(action)) objectPermissions.allow.push(action);
                    if (objectPermissions.deny.includes(action))
                        objectPermissions.deny = objectPermissions.deny.filter((a) => a !== action);
                } else if (permissions === 'deny') {
                    if (!objectPermissions.deny.includes(action)) objectPermissions.deny.push(action);
                    if (objectPermissions.allow.includes(action))
                        objectPermissions.allow = objectPermissions.allow.filter((a) => a !== action);
                }
            };
            const handleNewObjectPermissions = () => {
                if (!resourcePermissions.objects) resourcePermissions.objects = [];

                resourcePermissions.objects.push({
                    uuid: objectUuid,
                    name: objectName,
                    allow: permissions === 'allow' ? [action] : [],
                    deny: permissions === 'deny' ? [action] : [],
                });
            };

            const objectPermissions = resourcePermissions.objects?.find((o) => o.uuid === objectUuid);

            if (objectPermissions) {
                handleExistingObjectPermissions(objectPermissions);
            } else {
                handleNewObjectPermissions();
            }
        },
        [],
    );
    const setOLP = useCallback(
        (resourceUuid: string, objectUuid: string, objectName: string, action: string, permissions: 'allow' | 'deny') => {
            const resource = resources?.find((r) => r.uuid === resourceUuid);
            if (!resource) return;

            const newPermissions: SubjectPermissionsModel = clonePerms();

            const resourcePermissions = newPermissions.resources.find((r) => r.name === resource.name);

            if (resourcePermissions) {
                setExistingOLP(resourcePermissions, objectUuid, objectName, action, permissions);
            } else {
                newPermissions.resources.push({
                    name: resource.name,
                    allowAllActions: false,
                    actions: [],
                    objects: [
                        {
                            uuid: objectUuid,
                            name: objectName,
                            allow: permissions === 'allow' ? [action] : [],
                            deny: permissions === 'deny' ? [action] : [],
                        },
                    ],
                });
            }

            onPermissionsChanged?.(newPermissions);
        },
        [clonePerms, onPermissionsChanged, resources, setExistingOLP],
    );

    const resourceList = useMemo(
        () =>
            resources?.map((resource) => {
                const isSelected = currentResource?.uuid === resource.uuid;
                const permissionText = getPermissions(resource);

                return (
                    <button
                        key={resource.uuid}
                        onClick={() => onResourceSelected(resource)}
                        className={cn(
                            'w-full text-left px-3 py-2 rounded-lg transition-colors',
                            'hover:bg-gray-50 dark:hover:bg-neutral-800',
                            {
                                'bg-gray-100 border border-gray-300 dark:bg-neutral-800 dark:border-neutral-700': isSelected,
                                'border border-gray-200 dark:border-neutral-700': !isSelected,
                            },
                        )}
                    >
                        <div className="font-medium text-sm text-[var(--dark-gray-color)] dark:text-neutral-200">
                            {resource.displayName}
                        </div>
                        <div className="text-xs text-[var(--dark-gray-color)] dark:text-neutral-400 mt-1">{permissionText}</div>
                    </button>
                );
            }),
        [currentResource, getPermissions, onResourceSelected, resources],
    );

    const allowAllResources = permissions?.allowAllResources || false;

    const permissionsList = useMemo(
        () =>
            currentResource ? (
                <div>
                    <div className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Resource Action Permissions</h3>

                        <div className="space-y-4">
                            <div className={cn('flex items-center', { 'opacity-50': allowAllResources })}>
                                <Checkbox
                                    id="allPermissions"
                                    checked={
                                        allowAllResources ||
                                        permissions?.resources.find((r) => r.name === currentResource.name)?.allowAllActions ||
                                        false
                                    }
                                    disabled={disabled || permissions.allowAllResources}
                                    onChange={(checked) => allowAllActions(currentResource, checked)}
                                    label="Allow All Permissions"
                                />
                            </div>

                            <Container className="flex-row flex-wrap" gap={4}>
                                {currentResource.actions.map((action) => {
                                    const allowAllActions =
                                        permissions?.resources.find((r) => r.name === currentResource.name)?.allowAllActions || false;
                                    const isChecked =
                                        allowAllResources ||
                                        allowAllActions ||
                                        permissions?.resources
                                            .find((r) => r.name === currentResource.name)
                                            ?.actions.includes(action.name) ||
                                        false;
                                    const isDisabled =
                                        disabled ||
                                        allowAllResources ||
                                        permissions?.resources.find((r) => r.name === currentResource.name)?.allowAllActions ||
                                        false;

                                    return (
                                        <label
                                            htmlFor={`action-${action.uuid}`}
                                            key={action.uuid}
                                            className={cn(
                                                'flex items-center border border-gray-200 dark:border-neutral-700 px-4 py-3 rounded-lg w-1/2 md:w-[calc(25%-12px)] cursor-pointer',
                                                {
                                                    'opacity-50': isDisabled,
                                                },
                                            )}
                                        >
                                            <Checkbox
                                                id={`action-${action.uuid}`}
                                                checked={isChecked}
                                                disabled={isDisabled}
                                                onChange={(checked) => allowAction(currentResource, action.name, checked)}
                                                label={action.displayName}
                                            />
                                        </label>
                                    );
                                })}
                            </Container>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-center h-64 text-gray-500 dark:text-neutral-400">
                    Select a resource from the left to configure permissions
                </div>
            ),
        [allowAction, allowAllActions, allowAllResources, currentResource, disabled, permissions],
    );

    const objectHeaders: TableHeader[] = useMemo(
        () => [
            {
                id: 'objectName',
                content: 'NAME',
                sortable: true,
                sort: 'asc',
                align: 'left',
            },

            ...(currentResource?.actions.map(
                (action) =>
                    ({
                        id: action.name,
                        content: action.displayName.toUpperCase(),
                        sortable: false,
                        align: 'center',
                        width: '5em',
                    }) as TableHeader,
            ) || []),
        ],
        [currentResource],
    );

    const getObjectRowActions = useCallback(
        (object: ObjectPermissionsResponseModel): React.ReactNode[] =>
            currentResource?.actions.map((action) => (
                <button
                    key={`${object.uuid}_${action.name}`}
                    type="button"
                    aria-label="Permission action"
                    onClick={(e) => e.stopPropagation()}
                    className="flex justify-center bg-transparent border-0 p-0 cursor-pointer"
                >
                    <Checkbox
                        id={`${object.uuid}_${action.name}`}
                        checked={object.allow.includes(action.name)}
                        disabled={disabled}
                        onChange={(checked) =>
                            setOLP(currentResource.uuid, object.uuid, object.name, action.name, checked ? 'allow' : 'deny')
                        }
                    />
                </button>
            )) || [],
        [currentResource, disabled, setOLP],
    );

    const objectRows: TableDataRow[] = useMemo(
        () =>
            permissions.resources
                .find((r) => r.name === currentResource?.name)
                ?.objects?.map((object) => ({
                    id: object.uuid,
                    columns: [
                        <span key="name" className="font-medium text-gray-900 dark:text-white whitespace-nowrap">
                            {object.name}
                        </span>,
                        ...getObjectRowActions(object),
                    ],
                })) || [],

        [currentResource?.name, permissions.resources, getObjectRowActions],
    );

    const onAddClick = useCallback(() => {
        setObjectListDialog(true);
    }, []);

    const onRemoveClick = useCallback(() => {
        const newPermissions = clonePerms();

        const resourcePermissions = newPermissions.resources.find((r) => r.name === currentResource?.name);

        if (resourcePermissions) {
            resourcePermissions.objects = resourcePermissions.objects?.filter((o) => !selectedObjects.includes(o.uuid));

            onPermissionsChanged?.(newPermissions);
        }
    }, [clonePerms, currentResource?.name, onPermissionsChanged, selectedObjects]);

    const onAllowAllClick = useCallback(() => {
        const newPermissions = clonePerms();

        const resourcePermissions = newPermissions.resources.find((r) => r.name === currentResource?.name);

        if (resourcePermissions) {
            resourcePermissions.objects = resourcePermissions.objects?.map((o) => {
                if (selectedObjects.includes(o.uuid)) {
                    return {
                        ...o,
                        allow: currentResource?.actions.map((a) => a.name) || [],
                        deny: [],
                    };
                }

                return o;
            });

            onPermissionsChanged?.(newPermissions);
        }
    }, [clonePerms, currentResource?.actions, currentResource?.name, onPermissionsChanged, selectedObjects]);

    const onDenyAllClick = useCallback(() => {
        const newPermissions = clonePerms();

        const resourcePermissions = newPermissions.resources.find((r) => r.name === currentResource?.name);

        if (resourcePermissions) {
            resourcePermissions.objects = resourcePermissions.objects?.map((o) => {
                if (selectedObjects.includes(o.uuid)) {
                    return {
                        ...o,
                        allow: [],
                        deny: currentResource?.actions.map((a) => a.name) || [],
                    };
                }

                return o;
            });

            onPermissionsChanged?.(newPermissions);
        }
    }, [clonePerms, currentResource?.actions, currentResource?.name, onPermissionsChanged, selectedObjects]);

    const addSelectedObjects = useCallback(() => {
        const newPermissions = clonePerms();
        let perms = newPermissions.resources.find((r) => r.name === currentResource?.name);

        if (!perms) {
            perms = {
                name: currentResource?.name || '',
                allowAllActions: false,
                actions: [],
                objects: [],
            };

            newPermissions.resources.push(perms);
        }

        perms.objects = perms.objects || [];

        objectsToAdd.forEach((uuid) => {
            const object = objects?.find((o) => o.uuid === uuid);

            if (!object || !perms) {
                console.error('Unexpected error!');
                return;
            }

            perms.objects!.push({
                uuid: object.uuid,
                name: object.name,
                allow: perms.allowAllActions ? currentResource?.actions.map((a) => a.name) || [] : perms.actions,
                deny: [],
            });
        });

        onPermissionsChanged?.(newPermissions);
        setObjectListDialog(false);
    }, [clonePerms, currentResource, objects, objectsToAdd, onPermissionsChanged]);

    const objectsToSelect: TableHeader[] = useMemo(
        () => [
            {
                id: 'objectName',
                content: 'Name',
                sortable: true,
                sort: 'asc',
                align: 'left',
            },
        ],
        [],
    );

    const objectsToSelectRows: TableDataRow[] = useMemo(
        () =>
            objects
                ?.filter(
                    (o) => !permissions.resources.find((r) => r.name === currentResource?.name)?.objects?.find((oo) => oo.uuid === o.uuid),
                )
                .map((object) => ({
                    id: object.uuid,
                    columns: [
                        <span key={object.uuid} className="whitespace-nowrap">
                            {object.name}
                        </span>,
                    ],
                })) || [],
        [currentResource, objects, permissions],
    );

    return (
        <div className="space-y-4">
            <Checkbox
                id="allResources"
                checked={allowAllResources}
                disabled={disabled}
                onChange={(checked) => {
                    if (onPermissionsChanged && permissions) onPermissionsChanged({ ...permissions, allowAllResources: checked });
                }}
                label="Allow All Actions for All Resources"
            />

            <div className="flex gap-4">
                <div className="w-46 flex-shrink-0">
                    <SimpleBar forceVisible="y" style={{ maxHeight: 'calc(100vh - 420px)' }}>
                        <div className="space-y-2">{resourceList}</div>
                    </SimpleBar>
                </div>

                <div className="flex-1 min-w-0">
                    {permissionsList}

                    {currentResource?.objectAccess && (
                        <div className="mt-4 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg">
                            <div className="px-3 py-3 border-b border-gray-200 dark:border-neutral-700 flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Object Action Permissions</h3>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="transparent"
                                        onClick={onAddClick}
                                        disabled={disabled}
                                        title="Add object"
                                        className="!p-2"
                                    >
                                        <Plus size={16} />
                                    </Button>
                                    <Button
                                        variant="transparent"
                                        color="danger"
                                        onClick={onRemoveClick}
                                        disabled={selectedObjects.length === 0 || disabled}
                                        title="Remove objects"
                                        className="!p-2"
                                    >
                                        <Trash2 size={16} />
                                    </Button>
                                    <Button
                                        variant="transparent"
                                        onClick={onAllowAllClick}
                                        disabled={selectedObjects.length === 0 || disabled}
                                        title="Allow all actions"
                                        className="!p-2"
                                    >
                                        <Check size={16} />
                                    </Button>
                                    <Button
                                        variant="transparent"
                                        color="danger"
                                        onClick={onDenyAllClick}
                                        disabled={selectedObjects.length === 0 || disabled}
                                        title="Deny all actions"
                                        className="!p-2"
                                    >
                                        <X size={16} />
                                    </Button>
                                </div>
                            </div>
                            <div className="p-6">
                                {isFetchingObjects ? (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                    </div>
                                ) : (
                                    <CustomTable
                                        headers={objectHeaders}
                                        data={objectRows}
                                        hasCheckboxes={true}
                                        checkedRows={selectedObjects}
                                        onCheckedRowsChanged={(rows) => setSelectedObjects(rows as string[])}
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Dialog
                isOpen={objectListDialog}
                caption="Edit Object Level Permissions"
                body={
                    <CustomTable
                        hasCheckboxes
                        headers={objectsToSelect}
                        data={objectsToSelectRows}
                        onCheckedRowsChanged={(rows) => setObjectsToAdd(rows as string[])}
                    />
                }
                toggle={() => setObjectListDialog(false)}
                size="lg"
                buttons={[
                    { variant: 'outline', color: 'primary', onClick: () => setObjectListDialog(false), body: 'Close' },
                    { disabled: objectsToAdd.length === 0, color: 'primary', onClick: () => addSelectedObjects(), body: 'Save' },
                ]}
            />
            {resources !== undefined && submitButtonsGroup}
        </div>
    );
}

export default RolePermissionsEditor;
