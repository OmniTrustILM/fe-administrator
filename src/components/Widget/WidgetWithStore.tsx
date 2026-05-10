import type React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { createMockStore } from 'utils/test-helpers';
import Widget from './index';
import { LockWidgetNameEnum, LockTypeEnum, type WidgetLockModel } from 'types/user-interface';

export type WidgetWithStoreProps = {
    preloadedState?: Parameters<typeof createMockStore>[0];
    title?: string;
    titleLink?: string;
    dataTestId?: string;
    children?: React.ReactNode;
    widgetLockName?: LockWidgetNameEnum;
    refreshAction?: () => void;
};

const defaultPreloadedState: Parameters<typeof createMockStore>[0] = {
    userInterface: {
        widgetLocks: [],
        globalModal: {
            title: undefined,
            size: 'sm',
            content: undefined,
            isOpen: false,
            showCancelButton: false,
            showOkButton: false,
            showCloseButton: false,
            showSubmitButton: false,
            okButtonCallback: undefined,
            cancelButtonCallback: undefined,
        },
    },
};

export function createWidgetLock(overrides: Partial<WidgetLockModel> = {}): WidgetLockModel {
    return {
        widgetName: LockWidgetNameEnum.ListOfCertificates,
        lockTitle: 'Locked',
        lockText: 'Widget is locked',
        lockType: LockTypeEnum.GENERIC,
        ...overrides,
    };
}

function WidgetWithStore({
    preloadedState,
    title = 'Test Widget',
    titleLink,
    dataTestId = 'widget-test',
    children,
    widgetLockName,
    refreshAction,
}: Readonly<WidgetWithStoreProps>) {
    const store = createMockStore(preloadedState ?? defaultPreloadedState);
    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/']}>
                <Widget
                    title={title}
                    titleLink={titleLink}
                    dataTestId={dataTestId}
                    widgetLockName={widgetLockName}
                    refreshAction={refreshAction}
                >
                    {children}
                </Widget>
            </MemoryRouter>
        </Provider>
    );
}
export default WidgetWithStore;
