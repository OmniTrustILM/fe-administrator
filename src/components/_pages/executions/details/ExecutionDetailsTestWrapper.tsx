import { configureStore } from '@reduxjs/toolkit';
import { useMemo } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';

import { testInitialState, testReducers } from 'ducks/test-reducers';
import { ExecutionType, PlatformEnum, Resource } from 'types/openapi';
import type { ExecutionModel } from 'types/rules';

import ExecutionDetails from './index';

export type ExecutionDetailsTestWrapperProps = Readonly<{
    execution: ExecutionModel;
}>;

export function ExecutionDetailsTestWrapper({ execution }: ExecutionDetailsTestWrapperProps) {
    const store = useMemo(
        () =>
            configureStore({
                reducer: testReducers,
                middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
                preloadedState: {
                    ...testInitialState,
                    enums: {
                        platformEnums: {
                            [PlatformEnum.ExecutionType]: {
                                [ExecutionType.RenewCertificate]: { code: ExecutionType.RenewCertificate, label: 'Renew certificate' },
                            },
                            [PlatformEnum.Resource]: {
                                [Resource.Certificates]: { code: Resource.Certificates, label: 'Certificates' },
                            },
                        },
                    },
                    rules: { ...testInitialState.rules, executionDetails: execution },
                } as never,
            }),
        [execution],
    );

    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={[`/executions/${execution.uuid}`]}>
                <Routes>
                    <Route path="/executions/:id" element={<ExecutionDetails />} />
                </Routes>
            </MemoryRouter>
        </Provider>
    );
}
