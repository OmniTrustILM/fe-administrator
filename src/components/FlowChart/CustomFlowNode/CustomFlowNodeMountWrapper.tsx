import React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { ReactFlowProvider } from 'reactflow';
import CustomFlowNode from './index';
import type { EntityNodeProps } from 'types/flowchart';
import { createMockStore } from 'utils/test-helpers';
import { testInitialState } from 'ducks/test-reducers';

type StoreType = ReturnType<typeof createMockStore>;

type Props = {
    nodeProps: EntityNodeProps;
    /** Serializable initial state so store is created in browser (CT cannot pass store from Node). */
    initialStoreState?: typeof testInitialState;
    /** Called with store instance after mount (for tests that need to assert on state). */
    onStoreReady?: (store: StoreType) => void;
};

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
    state = { error: null as Error | null };
    static getDerivedStateFromError(error: Error) {
        return { error };
    }
    render() {
        if (this.state.error) {
            return <div data-testid="mount-error">{this.state.error.message}</div>;
        }
        return this.props.children;
    }
}

/**
 * Wrapper for Playwright CT: creates store in browser and renders CustomFlowNode with providers.
 * Must live outside the spec file so CT can mount it.
 */
export default function CustomFlowNodeMountWrapper({ nodeProps, initialStoreState, onStoreReady }: Readonly<Props>) {
    const store = React.useMemo(() => createMockStore((initialStoreState ?? testInitialState) as any), [initialStoreState]);
    React.useEffect(() => {
        onStoreReady?.(store);
    }, [store, onStoreReady]);
    return (
        <Provider store={store}>
            <MemoryRouter initialEntries={['/']}>
                <ReactFlowProvider>
                    <ErrorBoundary>
                        <CustomFlowNode {...nodeProps} />
                    </ErrorBoundary>
                </ReactFlowProvider>
            </MemoryRouter>
        </Provider>
    );
}
