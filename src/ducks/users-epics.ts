import { from, iif, of } from 'rxjs';
import { catchError, concatMap, exhaustMap, filter, map, mergeMap, switchMap, toArray } from 'rxjs/operators';

import type { AppEpic } from 'ducks';
import { extractError } from 'utils/net';

import { actions as appRedirectActions } from './app-redirect';
import { actions as userInterfaceActions } from './user-interface';
import { slice } from './users';

import { LockWidgetNameEnum } from 'types/user-interface';
import { transformRoleResponseDtoToModel, transformUserDetailDtoToModel, transformUserUpdateRequestModelToDto } from './transform/auth';
import { transformUserAddRequestModelToDto, transformUserResponseDtoToModel } from './transform/users';

const list: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.list.match),
        switchMap(() =>
            deps.apiClients.users.listUsers().pipe(
                switchMap((list) =>
                    of(
                        slice.actions.listSuccess({
                            users: list.map(transformUserResponseDtoToModel),
                        }),
                        userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.ListOfUsers),
                    ),
                ),

                catchError((err) =>
                    of(
                        slice.actions.listFailure({ error: extractError(err, 'Failed to get user list') }),
                        userInterfaceActions.insertWidgetLock(err, LockWidgetNameEnum.ListOfUsers),
                    ),
                ),
            ),
        ),
    );
};

const getDetail: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.getDetail.match),
        switchMap((action) =>
            deps.apiClients.users.getUser({ userUuid: action.payload.uuid }).pipe(
                switchMap((detail) =>
                    of(
                        slice.actions.getDetailSuccess({
                            user: transformUserDetailDtoToModel(detail),
                        }),
                        userInterfaceActions.removeWidgetLock(LockWidgetNameEnum.UserDetails),
                    ),
                ),
                catchError((err) =>
                    of(
                        slice.actions.getDetailFailure({ error: extractError(err, 'Failed to load user detail') }),
                        userInterfaceActions.insertWidgetLock(err, LockWidgetNameEnum.UserDetails),
                    ),
                ),
            ),
        ),
    );
};

const create: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.create.match),

        switchMap((action) =>
            deps.apiClients.users.createUser({ addUserRequestDto: transformUserAddRequestModelToDto(action.payload.userAddRequest) }).pipe(
                switchMap((user) =>
                    deps.apiClients.users
                        .updateRoles({
                            userUuid: user.uuid,
                            requestBody: action.payload.roles || [],
                        })
                        .pipe(
                            mergeMap((userDetailDto) =>
                                of(
                                    slice.actions.createSuccess({ user: transformUserDetailDtoToModel(userDetailDto) }),
                                    appRedirectActions.redirect({ url: `../users/detail/${userDetailDto.uuid}` }),
                                ),
                            ),

                            catchError((err) =>
                                of(
                                    slice.actions.createSuccess({ user: transformUserDetailDtoToModel(user) }),
                                    appRedirectActions.redirect({ url: `../users/detail/${user.uuid}` }),
                                    appRedirectActions.fetchError({
                                        error: err,
                                        message: `User ${user.username} was created, but its roles could not be assigned`,
                                    }),
                                ),
                            ),
                        ),
                ),

                catchError((err) =>
                    of(
                        slice.actions.createFailure({ error: extractError(err, 'Failed to create user') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to create user' }),
                    ),
                ),
            ),
        ),
    );
};

const update: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.update.match),
        switchMap((action) =>
            deps.apiClients.users
                .updateUser({
                    userUuid: action.payload.uuid,
                    updateUserRequestDto: transformUserUpdateRequestModelToDto(action.payload.updateUserRequest),
                })
                .pipe(
                    switchMap((userDetailDto) =>
                        deps.apiClients.users.updateRoles({ userUuid: userDetailDto.uuid, requestBody: action.payload.roles || [] }).pipe(
                            mergeMap(() =>
                                of(
                                    slice.actions.updateSuccess({ user: transformUserDetailDtoToModel(userDetailDto) }),
                                    appRedirectActions.redirect({ url: `../../users/detail/${userDetailDto.uuid}` }),
                                ),
                            ),

                            catchError((err) =>
                                of(
                                    slice.actions.updateFailure({ error: extractError(err, 'Failed to update user roles') }),
                                    appRedirectActions.fetchError({ error: err, message: 'Failed to update user roles' }),
                                ),
                            ),
                        ),
                    ),

                    catchError((err) =>
                        of(
                            slice.actions.updateFailure({ error: extractError(err, 'Failed to update user') }),
                            appRedirectActions.fetchError({ error: err, message: 'Failed to update user' }),
                        ),
                    ),
                ),
        ),
    );
};

const deleteUser: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.deleteUser.match),
        mergeMap((action) =>
            deps.apiClients.users.deleteUser({ userUuid: action.payload.uuid }).pipe(
                mergeMap(() =>
                    iif(
                        () => !!action.payload.redirect,
                        of(
                            slice.actions.deleteUserSuccess({ uuid: action.payload.uuid, redirect: action.payload.redirect }),
                            appRedirectActions.redirect({ url: action.payload.redirect! }),
                        ),
                        of(slice.actions.deleteUserSuccess({ uuid: action.payload.uuid, redirect: action.payload.redirect })),
                    ),
                ),

                catchError((err) =>
                    of(
                        slice.actions.deleteUserFailure({ error: extractError(err, 'Failed to delete user') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to delete user' }),
                    ),
                ),
            ),
        ),
    );
};

const bulkDeleteUsers: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.bulkDeleteUsers.match),
        exhaustMap((action) =>
            from(action.payload.uuids).pipe(
                concatMap((uuid) =>
                    deps.apiClients.users.deleteUser({ userUuid: uuid }).pipe(
                        map(() => ({ uuid, ok: true })),
                        catchError(() => of({ uuid, ok: false })),
                    ),
                ),
                toArray(),
                mergeMap((results) => {
                    const deletedUuids = results.filter((result) => result.ok).map((result) => result.uuid);
                    const failedDeletes = results.length - deletedUuids.length;

                    if (failedDeletes === 0) {
                        return of(slice.actions.bulkDeleteUsersSuccess({ uuids: deletedUuids }));
                    }

                    return of(
                        slice.actions.bulkDeleteUsersSuccess({ uuids: deletedUuids }),
                        slice.actions.bulkDeleteUsersFailure({
                            error: `Failed to delete ${failedDeletes} user${failedDeletes === 1 ? '' : 's'}`,
                        }),
                        appRedirectActions.fetchError({
                            error: undefined,
                            message: `Failed to delete ${failedDeletes} user${failedDeletes === 1 ? '' : 's'}`,
                        }),
                    );
                }),
                catchError((err) =>
                    of(
                        slice.actions.bulkDeleteUsersFailure({ error: extractError(err, 'Failed to delete users') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to delete users' }),
                    ),
                ),
            ),
        ),
    );
};

const enable: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.enable.match),
        mergeMap((action) =>
            deps.apiClients.users.enableUser({ userUuid: action.payload.uuid }).pipe(
                map(() => slice.actions.enableSuccess({ uuid: action.payload.uuid })),

                catchError((err) =>
                    of(
                        slice.actions.enableFailure({ error: extractError(err, 'Failed to enable user') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to enable user' }),
                    ),
                ),
            ),
        ),
    );
};

const disable: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.disable.match),
        mergeMap((action) =>
            deps.apiClients.users.disableUser({ userUuid: action.payload.uuid }).pipe(
                map(() => slice.actions.disableSuccess({ uuid: action.payload.uuid })),

                catchError((err) =>
                    of(
                        slice.actions.disableFailure({ error: extractError(err, 'Failed to disable user') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to disable user' }),
                    ),
                ),
            ),
        ),
    );
};

const getRoles: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.getRoles.match),
        switchMap((action) =>
            deps.apiClients.users.getUserRoles({ userUuid: action.payload.uuid }).pipe(
                map((roles) =>
                    slice.actions.getRolesSuccess({ uuid: action.payload.uuid, roles: roles.map(transformRoleResponseDtoToModel) }),
                ),

                catchError((err) =>
                    of(
                        slice.actions.getRolesFailure({ error: extractError(err, 'Failed to get roles') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to get roles' }),
                    ),
                ),
            ),
        ),
    );
};

const updateRoles: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.updateRoles.match),
        switchMap((action) =>
            deps.apiClients.users.updateRoles({ userUuid: action.payload.uuid, requestBody: action.payload.roles }).pipe(
                map((user) => slice.actions.updateRolesSuccess({ user: transformUserDetailDtoToModel(user) })),

                catchError((err) =>
                    of(
                        slice.actions.updateRolesFailure({ error: extractError(err, 'Failed to update roles') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to update roles' }),
                    ),
                ),
            ),
        ),
    );
};

const addRole: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.addRole.match),
        switchMap((action) =>
            deps.apiClients.users.addRole({ userUuid: action.payload.uuid, roleUuid: action.payload.roleUuid }).pipe(
                map((user) => slice.actions.addRoleSuccess({ user: transformUserDetailDtoToModel(user) })),

                catchError((err) =>
                    of(
                        slice.actions.addRoleFailure({ error: extractError(err, 'Failed to add role') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to add role' }),
                    ),
                ),
            ),
        ),
    );
};

const removeRole: AppEpic = (action$, state, deps) => {
    return action$.pipe(
        filter(slice.actions.removeRole.match),
        switchMap((action) =>
            deps.apiClients.users.removeRole({ userUuid: action.payload.uuid, roleUuid: action.payload.roleUuid }).pipe(
                map((user) => slice.actions.removeRoleSuccess({ user: transformUserDetailDtoToModel(user) })),

                catchError((err) =>
                    of(
                        slice.actions.removeRoleFailure({ error: extractError(err, 'Failed to remove role') }),
                        appRedirectActions.fetchError({ error: err, message: 'Failed to remove role' }),
                    ),
                ),
            ),
        ),
    );
};

const epics = [list, getDetail, create, update, deleteUser, bulkDeleteUsers, enable, disable, getRoles, updateRoles, addRole, removeRole];

export default epics;
