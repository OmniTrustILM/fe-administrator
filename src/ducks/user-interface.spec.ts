import { describe, expect, test, vi } from 'vitest';
import reducer, { actions, initialState, selectors } from './user-interface';
import { LockTypeEnum, LockWidgetNameEnum } from 'types/user-interface';

describe('user-interface slice', () => {
    test('returns initial state for unknown action', () => {
        expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    test('resetState restores initial state', () => {
        const modified = {
            ...initialState,
            attributeCallbackValue: 'x',
            formCallbackValue: 'y',
            initiateAttributeCallback: true,
            initiateFormCallback: true,
        };
        const next = reducer(modified, actions.resetState());
        expect(next).toEqual(initialState);
    });

    test('resetState removes extra keys', () => {
        const modified = { ...initialState, extraKey: 'gone' } as any;
        const next = reducer(modified, actions.resetState());
        expect((next as any).extraKey).toBeUndefined();
    });

    test('insertWidgetLock adds lock when not present', () => {
        const errorPayload = { lockTitle: 'Locked', lockText: 'Message', lockType: LockTypeEnum.GENERIC };
        const next = reducer(initialState, actions.insertWidgetLock(errorPayload as any, LockWidgetNameEnum.ListOfCertificates));
        expect(next.widgetLocks).toHaveLength(1);
        expect(next.widgetLocks[0].widgetName).toBe(LockWidgetNameEnum.ListOfCertificates);
        expect(next.widgetLocks[0].lockTitle).toBe('Locked');
        expect(next.widgetLocks[0].lockText).toBe('Message');
        expect(next.widgetLocks[0].lockType).toBe(LockTypeEnum.GENERIC);
    });

    test('insertWidgetLock does not duplicate same widgetName', () => {
        const stateWithLock = {
            ...initialState,
            widgetLocks: [
                { widgetName: LockWidgetNameEnum.ListOfCertificates, lockTitle: 'A', lockText: 'T', lockType: LockTypeEnum.GENERIC },
            ],
        };
        const errorPayload = { lockTitle: 'B', lockText: 'T2', lockType: LockTypeEnum.GENERIC };
        const next = reducer(stateWithLock, actions.insertWidgetLock(errorPayload as any, LockWidgetNameEnum.ListOfCertificates));
        expect(next.widgetLocks).toHaveLength(1);
        expect(next.widgetLocks[0].lockTitle).toBe('A');
    });

    test('insertWidgetLock allows different widgetNames', () => {
        const stateWithLock = {
            ...initialState,
            widgetLocks: [
                { widgetName: LockWidgetNameEnum.ListOfCertificates, lockTitle: 'A', lockText: 'T', lockType: LockTypeEnum.GENERIC },
            ],
        };
        const errorPayload = { lockTitle: 'B', lockText: 'T2', lockType: LockTypeEnum.PERMISSION };
        const next = reducer(stateWithLock, actions.insertWidgetLock(errorPayload as any, LockWidgetNameEnum.ListOfRAProfiles));
        expect(next.widgetLocks).toHaveLength(2);
    });

    test('removeWidgetLock removes lock by name', () => {
        const stateWithLock = {
            ...initialState,
            widgetLocks: [
                {
                    widgetName: LockWidgetNameEnum.ListOfCertificates,
                    lockTitle: 'Locked',
                    lockText: 'Text',
                    lockType: LockTypeEnum.GENERIC,
                },
            ],
        };
        const next = reducer(stateWithLock, actions.removeWidgetLock(LockWidgetNameEnum.ListOfCertificates));
        expect(next.widgetLocks).toHaveLength(0);
    });

    test('removeWidgetLock leaves other locks', () => {
        const stateWithLocks = {
            ...initialState,
            widgetLocks: [
                { widgetName: LockWidgetNameEnum.ListOfCertificates, lockTitle: 'A', lockText: 'T', lockType: LockTypeEnum.GENERIC },
                { widgetName: LockWidgetNameEnum.ListOfRAProfiles, lockTitle: 'B', lockText: 'T', lockType: LockTypeEnum.GENERIC },
            ],
        };
        const next = reducer(stateWithLocks, actions.removeWidgetLock(LockWidgetNameEnum.ListOfCertificates));
        expect(next.widgetLocks).toHaveLength(1);
        expect(next.widgetLocks[0].widgetName).toBe(LockWidgetNameEnum.ListOfRAProfiles);
    });

    test('removeWidgetLock is a no-op when name not found', () => {
        const stateWithLock = {
            ...initialState,
            widgetLocks: [
                { widgetName: LockWidgetNameEnum.ListOfCertificates, lockTitle: 'A', lockText: 'T', lockType: LockTypeEnum.GENERIC },
            ],
        };
        const next = reducer(stateWithLock, actions.removeWidgetLock(LockWidgetNameEnum.ListOfRAProfiles));
        expect(next.widgetLocks).toHaveLength(1);
    });

    test('showGlobalModal updates globalModal', () => {
        const payload = {
            title: 'Title',
            size: 'md' as const,
            content: 'Content',
            isOpen: true,
            showCancelButton: true,
            showOkButton: false,
            showCloseButton: false,
            showSubmitButton: false,
            okButtonCallback: undefined,
            cancelButtonCallback: undefined,
        };
        const next = reducer(initialState, actions.showGlobalModal(payload));
        expect(next.globalModal).toEqual(payload);
        expect(next.globalModal?.isOpen).toBe(true);
    });

    test('hideGlobalModal resets globalModal to initial', () => {
        const stateWithModal = {
            ...initialState,
            globalModal: {
                ...initialState.globalModal,
                isOpen: true,
                title: 'Open',
            },
        };
        const next = reducer(stateWithModal, actions.hideGlobalModal());
        expect(next.globalModal).toEqual(initialState.globalModal);
    });

    test('updateModalContent sets content', () => {
        const next = reducer(initialState, actions.updateModalContent('new content'));
        expect(next.globalModal.content).toBe('new content');
    });

    test('setOkButtonCallback sets okButtonCallback', () => {
        const cb = vi.fn();
        const next = reducer(initialState, actions.setOkButtonCallback(cb));
        expect(next.globalModal.okButtonCallback).toBe(cb);
    });

    test('setCancelButtonCallback sets cancelButtonCallback', () => {
        const cb = vi.fn();
        const next = reducer(initialState, actions.setCancelButtonCallback(cb));
        expect(next.globalModal.cancelButtonCallback).toBe(cb);
    });

    test('setInitiateAttributeCallback sets value', () => {
        let next = reducer(initialState, actions.setInitiateAttributeCallback(true));
        expect(next.initiateAttributeCallback).toBe(true);
        next = reducer(next, actions.setInitiateAttributeCallback(false));
        expect(next.initiateAttributeCallback).toBe(false);
    });

    test('setAttributeCallbackValue and clearAttributeCallbackValue', () => {
        let next = reducer(initialState, actions.setAttributeCallbackValue('value'));
        expect(next.attributeCallbackValue).toBe('value');
        next = reducer(next, actions.clearAttributeCallbackValue());
        expect(next.attributeCallbackValue).toBeUndefined();
    });

    test('setInitiateFormCallback sets value', () => {
        let next = reducer(initialState, actions.setInitiateFormCallback(true));
        expect(next.initiateFormCallback).toBe(true);
        next = reducer(next, actions.setInitiateFormCallback(false));
        expect(next.initiateFormCallback).toBe(false);
    });

    test('setFormCallbackValue and clearFormCallbackValue', () => {
        let next = reducer(initialState, actions.setFormCallbackValue('form-value'));
        expect(next.formCallbackValue).toBe('form-value');
        next = reducer(next, actions.clearFormCallbackValue());
        expect(next.formCallbackValue).toBeUndefined();
    });

    test('setReactFlowUI and clearReactFlowUI', () => {
        const flowUI = { flowChartNodes: [], flowChartEdges: [], flowDirection: 'TB' as const };
        let next = reducer(initialState, actions.setReactFlowUI(flowUI));
        expect(next.reactFlowUI).toEqual(flowUI);
        next = reducer(next, actions.clearReactFlowUI());
        expect(next.reactFlowUI).toBeUndefined();
    });

    test('updateReactFlowNodes updates nodes when reactFlowUI is set', () => {
        const flowUI = { flowChartNodes: [] as any[], flowChartEdges: [] as any[], flowDirection: 'TB' as const };
        const state = { ...initialState, reactFlowUI: flowUI };
        const nodes = [{ id: 'node-1' } as any, { id: 'node-2' } as any];
        const next = reducer(state, actions.updateReactFlowNodes(nodes));
        expect(next.reactFlowUI?.flowChartNodes).toEqual(nodes);
    });

    test('updateReactFlowNodes is a no-op when reactFlowUI is not set', () => {
        const nodes = [{ id: 'node-1' } as any];
        const next = reducer(initialState, actions.updateReactFlowNodes(nodes));
        expect(next.reactFlowUI).toBeUndefined();
    });

    test('updateReactFlowEdges updates edges when reactFlowUI is set', () => {
        const flowUI = { flowChartNodes: [] as any[], flowChartEdges: [] as any[], flowDirection: 'LR' as const };
        const state = { ...initialState, reactFlowUI: flowUI };
        const edges = [{ id: 'edge-1' } as any];
        const next = reducer(state, actions.updateReactFlowEdges(edges));
        expect(next.reactFlowUI?.flowChartEdges).toEqual(edges);
    });

    test('updateReactFlowEdges is a no-op when reactFlowUI is not set', () => {
        const edges = [{ id: 'edge-1' } as any];
        const next = reducer(initialState, actions.updateReactFlowEdges(edges));
        expect(next.reactFlowUI).toBeUndefined();
    });

    test('deleteNode removes node by id when reactFlowUI is set', () => {
        const nodes = [{ id: 'node-1' } as any, { id: 'node-2' } as any];
        const flowUI = { flowChartNodes: nodes, flowChartEdges: [] as any[] };
        const state = { ...initialState, reactFlowUI: flowUI };
        const next = reducer(state, actions.deleteNode('node-1'));
        expect(next.reactFlowUI?.flowChartNodes).toEqual([{ id: 'node-2' }]);
    });

    test('deleteNode is a no-op when reactFlowUI is not set', () => {
        const next = reducer(initialState, actions.deleteNode('node-1'));
        expect(next.reactFlowUI).toBeUndefined();
    });

    test('setShowHiddenNodes sets expandedHiddenNodeId when reactFlowUI is set', () => {
        const flowUI = { flowChartNodes: [] as any[], flowChartEdges: [] as any[] };
        const state = { ...initialState, reactFlowUI: flowUI };
        let next = reducer(state, actions.setShowHiddenNodes('node-42'));
        expect(next.reactFlowUI?.expandedHiddenNodeId).toBe('node-42');
        next = reducer(next, actions.setShowHiddenNodes(undefined));
        expect(next.reactFlowUI?.expandedHiddenNodeId).toBeUndefined();
    });

    test('setShowHiddenNodes is a no-op when reactFlowUI is not set', () => {
        const next = reducer(initialState, actions.setShowHiddenNodes('node-42'));
        expect(next.reactFlowUI).toBeUndefined();
    });

    test('insertReactFlowFormNode adds form node when not present', () => {
        const flowUI = { flowChartNodes: [] as any[], flowChartEdges: [] as any[] };
        const state = { ...initialState, reactFlowUI: flowUI };
        const formNode = { id: 'ReactFlowFormNode', type: 'form' } as any;
        const next = reducer(state, actions.insertReactFlowFormNode(formNode));
        expect(next.reactFlowUI?.flowChartNodes).toHaveLength(1);
        expect(next.reactFlowUI?.flowChartNodes[0].id).toBe('ReactFlowFormNode');
    });

    test('insertReactFlowFormNode does not add when already present', () => {
        const existingFormNode = { id: 'ReactFlowFormNode', type: 'form' } as any;
        const flowUI = { flowChartNodes: [existingFormNode], flowChartEdges: [] as any[] };
        const state = { ...initialState, reactFlowUI: flowUI };
        const newFormNode = { id: 'ReactFlowFormNode', type: 'form-new' } as any;
        const next = reducer(state, actions.insertReactFlowFormNode(newFormNode));
        expect(next.reactFlowUI?.flowChartNodes).toHaveLength(1);
    });

    test('insertReactFlowFormNode does not add non-form-node id', () => {
        const flowUI = { flowChartNodes: [] as any[], flowChartEdges: [] as any[] };
        const state = { ...initialState, reactFlowUI: flowUI };
        const regularNode = { id: 'some-other-node' } as any;
        const next = reducer(state, actions.insertReactFlowFormNode(regularNode));
        expect(next.reactFlowUI?.flowChartNodes).toHaveLength(0);
    });
});

describe('user-interface selectors', () => {
    const widgetLocks = [
        { widgetName: LockWidgetNameEnum.ListOfCertificates, lockTitle: 'L', lockText: 'T', lockType: LockTypeEnum.GENERIC },
    ];
    const globalModal = { ...initialState.globalModal, isOpen: true, title: 'Modal' };
    const flowUI = { flowChartNodes: [{ id: 'n1' } as any], flowChartEdges: [{ id: 'e1' } as any], expandedHiddenNodeId: 'n1' };
    const featureState = {
        ...initialState,
        widgetLocks,
        globalModal,
        initiateAttributeCallback: true,
        attributeCallbackValue: 'attr-val',
        initiateFormCallback: true,
        formCallbackValue: 'form-val',
        reactFlowUI: flowUI,
    };

    const reduxState = { userInterface: featureState } as any;

    test('selectWidgetLocks returns widget locks', () => {
        expect(selectors.selectWidgetLocks(reduxState)).toEqual(widgetLocks);
    });

    test('selectGlobalModal returns globalModal', () => {
        expect(selectors.selectGlobalModal(reduxState)).toEqual(globalModal);
    });

    test('selectInitiateAttributeCallback returns value', () => {
        expect(selectors.selectInitiateAttributeCallback(reduxState)).toBe(true);
    });

    test('selectAttributeCallbackValue returns value', () => {
        expect(selectors.selectAttributeCallbackValue(reduxState)).toBe('attr-val');
    });

    test('selectInitiateFormCallback returns value', () => {
        expect(selectors.selectInitiateFormCallback(reduxState)).toBe(true);
    });

    test('selectCallbackValue returns formCallbackValue', () => {
        expect(selectors.selectCallbackValue(reduxState)).toBe('form-val');
    });

    test('reactFlowUI selector returns reactFlowUI', () => {
        expect(selectors.reactFlowUI(reduxState)).toEqual(flowUI);
    });

    test('flowChartNodes selector returns nodes', () => {
        expect(selectors.flowChartNodes(reduxState)).toEqual(flowUI.flowChartNodes);
    });

    test('flowChartEdges selector returns edges', () => {
        expect(selectors.flowChartEdges(reduxState)).toEqual(flowUI.flowChartEdges);
    });

    test('expandedHiddenNodeId selector returns value', () => {
        expect(selectors.expandedHiddenNodeId(reduxState)).toBe('n1');
    });

    test('selectWidgetLocks returns empty array when widgetLocks is empty', () => {
        const emptyState = { userInterface: initialState } as any;
        expect(selectors.selectWidgetLocks(emptyState)).toEqual([]);
    });

    test('selectGlobalModal returns default when isOpen is false', () => {
        const emptyState = { userInterface: initialState } as any;
        expect(selectors.selectGlobalModal(emptyState)).toEqual(initialState.globalModal);
    });

    test('reactFlowUI selector returns undefined for initial state', () => {
        const emptyState = { userInterface: initialState } as any;
        expect(selectors.reactFlowUI(emptyState)).toBeUndefined();
    });

    test('flowChartNodes selector returns undefined when reactFlowUI is not set', () => {
        const emptyState = { userInterface: initialState } as any;
        expect(selectors.flowChartNodes(emptyState)).toBeUndefined();
    });

    test('flowChartEdges selector returns undefined when reactFlowUI is not set', () => {
        const emptyState = { userInterface: initialState } as any;
        expect(selectors.flowChartEdges(emptyState)).toBeUndefined();
    });

    test('expandedHiddenNodeId selector returns undefined when reactFlowUI is not set', () => {
        const emptyState = { userInterface: initialState } as any;
        expect(selectors.expandedHiddenNodeId(emptyState)).toBeUndefined();
    });

    test('selectState selector returns feature slice', () => {
        expect(selectors.selectState(reduxState)).toEqual(featureState);
    });
});
