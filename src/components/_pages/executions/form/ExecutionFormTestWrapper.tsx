import { configureStore, type Middleware, type UnknownAction } from '@reduxjs/toolkit';
import { useMemo } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';

import { actions as rulesActions } from 'ducks/rules';
import { testInitialState, testReducers } from 'ducks/test-reducers';
import { ExecutionType, PlatformEnum, Resource } from 'types/openapi';

import ExecutionForm from './index';

export type ExecutionFormTestWrapperProps = Readonly<{
    onCreateExecution?: (payload: unknown) => void;
}>;

const executionTypeEnum = {
    [ExecutionType.SetField]: { code: ExecutionType.SetField, label: 'Set field' },
    [ExecutionType.SendNotification]: { code: ExecutionType.SendNotification, label: 'Send notification' },
    [ExecutionType.RenewCertificate]: { code: ExecutionType.RenewCertificate, label: 'Renew certificate' },
};

export function ExecutionFormTestWrapper({ onCreateExecution }: ExecutionFormTestWrapperProps) {
    const store = useMemo(() => {
        const captureMiddleware: Middleware = () => (next) => (action) => {
            const typed = action as UnknownAction;
            if (typed.type === rulesActions.createExecution.type) {
                onCreateExecution?.(typed.payload);
            }
            return next(action);
        };
        return configureStore({
            reducer: testReducers,
            middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }).concat(captureMiddleware),
            preloadedState: {
                ...testInitialState,
                enums: {
                    platformEnums: {
                        [PlatformEnum.ExecutionType]: executionTypeEnum,
                        [PlatformEnum.Resource]: {
                            [Resource.Certificates]: { code: Resource.Certificates, label: 'Certificates' },
                            [Resource.Any]: { code: Resource.Any, label: 'Any' },
                        },
                    },
                },
                resource: {
                    ...testInitialState.resource,
                    resourcesList: [{ resource: Resource.Certificates, hasRuleEvaluator: true }],
                },
            } as never,
        });
    }, [onCreateExecution]);

    return (
        <Provider store={store}>
            <MemoryRouter>
                <ExecutionForm />
            </MemoryRouter>
        </Provider>
    );
}
