import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import Button from 'components/Button';
import Container from 'components/Container';

import ProgressButton from 'components/ProgressButton';
import Widget from 'components/Widget';
import { useNavigate, useParams } from 'react-router';

import Breadcrumb from 'components/Breadcrumb';
import { actions as authActions, selectors as authSelectors } from 'ducks/auth';
import { actions as rolesActions, selectors as rolesSelectors } from 'ducks/roles';

import type { SubjectPermissionsModel } from 'types/roles';
import RolePermissionsEditor from '../RolePermissionsEditor';

function RolePermissionsForm() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { id } = useParams();

    const roleSelector = useSelector(rolesSelectors.role);
    const rolePermissionsSelector = useSelector(rolesSelectors.permissions);
    const resourcesSelector = useSelector(authSelectors.resources);

    const isFetchingRoleDetail = useSelector(rolesSelectors.isFetchingDetail);
    const isFetchingPermissions = useSelector(rolesSelectors.isFetchingPermissions);
    const isFetchingResources = useSelector(authSelectors.isFetchingResources);

    const isCreatingRole = useSelector(rolesSelectors.isCreating);
    const isUpdatingRole = useSelector(rolesSelectors.isUpdating);

    const [permissions, setPermissions] = useState<SubjectPermissionsModel>();

    /* Load all users, resources and objects */

    useEffect(() => {
        dispatch(rolesActions.resetState());
        dispatch(authActions.clearResources());
        dispatch(authActions.getAuthResources());
    }, [dispatch]);

    const isUpdatingRolePermissions = useSelector(rolesSelectors.isUpdatingPermissions);
    const wasUpdating = useRef(isUpdatingRolePermissions);

    useEffect(() => {
        if (wasUpdating.current && !isUpdatingRolePermissions) {
            navigate(-1);
        }
        wasUpdating.current = isUpdatingRolePermissions;
    }, [isUpdatingRolePermissions, navigate]);

    /* Load role && role permissions */

    useEffect(() => {
        if (!id || roleSelector?.uuid === id) return;

        dispatch(rolesActions.getDetail({ uuid: id }));
        dispatch(rolesActions.getPermissions({ uuid: id }));
    }, [dispatch, id, roleSelector]);

    /* Set role permissions */

    useEffect(() => {
        if (!rolePermissionsSelector || rolePermissionsSelector.uuid !== id) return;
        setPermissions(rolePermissionsSelector.permissions);
    }, [id, rolePermissionsSelector]);

    const patchPermissions = useCallback(
        (outPerms: SubjectPermissionsModel) => {
            const perms = structuredClone(outPerms);

            const inPerms: SubjectPermissionsModel = rolePermissionsSelector?.permissions ?? {
                allowAllResources: false,
                resources: [],
            };

            for (const outRes of perms.resources) {
                const inRes = inPerms.resources.find((res) => res.name === outRes.name);

                if (!outRes.objects) continue;

                if (outRes.objects?.length === 0 && (!inRes || inRes.objects?.length === 0)) {
                    delete perms.objects;
                }
            }

            return perms;
        },
        [rolePermissionsSelector],
    );

    const handleSubmit = useCallback(() => {
        if (!id) return;
        const perms = patchPermissions(permissions!);
        dispatch(rolesActions.updatePermissions({ uuid: id, permissions: perms }));
    }, [dispatch, id, patchPermissions, permissions]);

    const handleCancel = useCallback(() => {
        navigate(-1);
    }, [navigate]);

    return (
        <>
            <Breadcrumb
                items={[
                    { label: 'Roles', href: '/roles' },
                    { label: roleSelector?.name || 'Role Permissions', href: '' },
                ]}
            />
            <Widget
                title={`${roleSelector?.name || ''} Role Permissions`}
                busy={isFetchingRoleDetail || isFetchingPermissions || isFetchingResources || isUpdatingRolePermissions}
            >
                <RolePermissionsEditor
                    resources={resourcesSelector}
                    permissions={permissions}
                    disabled={roleSelector?.systemRole}
                    onPermissionsChanged={(perms) => {
                        setPermissions(perms);
                    }}
                    submitButtonsGroup={
                        <Container className="flex-row justify-end" gap={4}>
                            <Button variant="outline" onClick={handleCancel} disabled={isCreatingRole || isUpdatingRole}>
                                Cancel
                            </Button>
                            <ProgressButton
                                title="Save"
                                inProgressTitle="Saving..."
                                inProgress={isCreatingRole || isUpdatingRole || isUpdatingRolePermissions}
                                disabled={isCreatingRole || isUpdatingRole || roleSelector?.systemRole}
                                onClick={handleSubmit}
                            />
                        </Container>
                    }
                />
            </Widget>
        </>
    );
}

export default RolePermissionsForm;
