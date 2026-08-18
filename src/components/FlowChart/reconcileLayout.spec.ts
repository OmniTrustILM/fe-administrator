import { describe, expect, it } from 'vitest';
import { type CustomNode, canReuseLayout, getLayoutedElements, reconcileLayout, replotExistingLayout } from 'components/FlowChart';
import { Position, type Edge } from 'reactflow';

const deepFreeze = <T>(value: T): T => {
    if (value && typeof value === 'object') {
        Object.values(value).forEach(deepFreeze);
        Object.freeze(value);
    }
    return value;
};

// The transform hooks rebuild these on every render, always at the origin, with fresh closures in
// `data` — which is exactly why the layout effect used to re-run the full dagre pass every time.
const makeIncomingNodes = (): CustomNode[] => [
    { id: 'main', type: 'customFlowNode', position: { x: 0, y: 0 }, data: { isMainNode: true, entityLabel: 'fresh label' } },
    { id: 'child', type: 'customFlowNode', parentId: 'main', hidden: true, position: { x: 0, y: 0 }, data: {} },
];

const incomingEdges: Edge[] = [{ id: 'e1', source: 'main', target: 'child' }];

const makeExistingLayout = () => ({
    nodes: [
        {
            id: 'main',
            type: 'customFlowNode',
            position: { x: 1200, y: 640 },
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
            data: { isMainNode: true, entityLabel: 'stale label' },
        },
        // A child the user revealed by expanding its parent: only redux knows it is visible.
        { id: 'child', type: 'customFlowNode', parentId: 'main', hidden: false, position: { x: 250, y: 120 }, data: {} },
    ] as CustomNode[],
    edges: [{ id: 'e1', source: 'main', target: 'child' }] as Edge[],
    flowDirection: 'TB' as const,
});

describe('canReuseLayout', () => {
    it('reuses the layout when the node ids, edge ids and direction all match', () => {
        expect(canReuseLayout(makeIncomingNodes(), incomingEdges, 'TB', makeExistingLayout())).toBe(true);
    });

    it('ignores the order the nodes and edges arrive in', () => {
        const existing = makeExistingLayout();
        existing.nodes.reverse();

        expect(canReuseLayout(makeIncomingNodes(), incomingEdges, 'TB', existing)).toBe(true);
    });

    it('lays out from scratch when there is no existing layout', () => {
        expect(canReuseLayout(makeIncomingNodes(), incomingEdges, 'TB', undefined)).toBe(false);
        expect(canReuseLayout(makeIncomingNodes(), incomingEdges, 'TB', { flowDirection: 'TB' })).toBe(false);
    });

    it('lays out from scratch when the flow direction changed', () => {
        expect(canReuseLayout(makeIncomingNodes(), incomingEdges, 'LR', makeExistingLayout())).toBe(false);
    });

    it('lays out from scratch when a node was added or removed', () => {
        const withExtraNode = [
            ...makeIncomingNodes(),
            { id: 'added', type: 'customFlowNode', position: { x: 0, y: 0 }, data: {} } as CustomNode,
        ];

        expect(canReuseLayout(withExtraNode, incomingEdges, 'TB', makeExistingLayout())).toBe(false);
        expect(canReuseLayout([makeIncomingNodes()[0]], incomingEdges, 'TB', makeExistingLayout())).toBe(false);
    });

    it('lays out from scratch when a node id changed', () => {
        const renamed = makeIncomingNodes();
        renamed[1] = { ...renamed[1], id: 'other-child' };

        expect(canReuseLayout(renamed, incomingEdges, 'TB', makeExistingLayout())).toBe(false);
    });

    it('lays out from scratch when the edges changed', () => {
        const extraEdge: Edge[] = [...incomingEdges, { id: 'e2', source: 'child', target: 'main' }];

        expect(canReuseLayout(makeIncomingNodes(), extraEdge, 'TB', makeExistingLayout())).toBe(false);
        expect(canReuseLayout(makeIncomingNodes(), [{ id: 'e9', source: 'main', target: 'child' }], 'TB', makeExistingLayout())).toBe(
            false,
        );
    });

    // Edge ids like `e1-chain-0` are positional, so the same id can point at a different pair once the
    // underlying collection changes. Dagre ranks by the wiring, so the old positions no longer hold.
    it('lays out from scratch when an edge kept its id but was rewired', () => {
        const rewired: Edge[] = [{ id: 'e1', source: 'child', target: 'main' }];

        expect(canReuseLayout(makeIncomingNodes(), rewired, 'TB', makeExistingLayout())).toBe(false);
    });

    // Dagre sizes a node 35px taller when it carries a description, which moves every rank below it.
    it('lays out from scratch when a node gained or lost its description', () => {
        const described = makeIncomingNodes();
        described[1] = { ...described[1], data: { ...described[1].data, description: 'now has one' } };

        expect(canReuseLayout(described, incomingEdges, 'TB', makeExistingLayout())).toBe(false);
    });

    // The STAR pass centres on isMainNode and rings everything else around it.
    it('lays out from scratch when the main node moved to another node', () => {
        const remained = makeIncomingNodes();
        remained[0] = { ...remained[0], data: { ...remained[0].data, isMainNode: false } };
        remained[1] = { ...remained[1], data: { ...remained[1].data, isMainNode: true } };

        expect(canReuseLayout(remained, incomingEdges, 'STAR', { ...makeExistingLayout(), flowDirection: 'STAR' })).toBe(false);
    });

    // STAR clusters the surrounding nodes by group, so regrouping repositions them.
    it('lays out from scratch when a node changed group', () => {
        const regrouped = makeIncomingNodes();
        regrouped[1] = { ...regrouped[1], data: { ...regrouped[1].data, group: 'locations' } };

        expect(canReuseLayout(regrouped, incomingEdges, 'TB', makeExistingLayout())).toBe(false);
    });

    // `hidden` is the one layout input the on-screen chart owns rather than the incoming data: it is how
    // an expanded parent is remembered. Folding it into the signature would re-plot on every expand.
    it('still reuses the layout when only the expansion state differs', () => {
        const collapsed = makeIncomingNodes();

        expect(collapsed[1].hidden).toBe(true);
        expect(makeExistingLayout().nodes[1].hidden).toBe(false);
        expect(canReuseLayout(collapsed, incomingEdges, 'TB', makeExistingLayout())).toBe(true);
    });
});

describe('replotExistingLayout', () => {
    it('keeps the positions the nodes already have on screen', () => {
        const { nodes } = replotExistingLayout(makeIncomingNodes(), incomingEdges, makeExistingLayout());

        expect(nodes.find((node) => node.id === 'main')?.position).toEqual({ x: 1200, y: 640 });
        expect(nodes.find((node) => node.id === 'child')?.position).toEqual({ x: 250, y: 120 });
    });

    it('keeps the handle orientation the previous layout picked', () => {
        const { nodes } = replotExistingLayout(makeIncomingNodes(), incomingEdges, makeExistingLayout());
        const main = nodes.find((node) => node.id === 'main');

        expect(main?.sourcePosition).toBe(Position.Right);
        expect(main?.targetPosition).toBe(Position.Left);
    });

    it('keeps a child the user revealed visible', () => {
        const { nodes } = replotExistingLayout(makeIncomingNodes(), incomingEdges, makeExistingLayout());

        expect(nodes.find((node) => node.id === 'child')?.hidden).toBe(false);
    });

    it('takes the fresh data and edges from the incoming flowchart', () => {
        const { nodes, edges } = replotExistingLayout(makeIncomingNodes(), incomingEdges, makeExistingLayout());

        expect(nodes.find((node) => node.id === 'main')?.data.entityLabel).toBe('fresh label');
        expect(edges).toBe(incomingEdges);
    });

    it('works on clones so frozen redux state is never mutated', () => {
        const incoming = deepFreeze(makeIncomingNodes());
        const existing = deepFreeze(makeExistingLayout());

        expect(() => replotExistingLayout(incoming, incomingEdges, existing)).not.toThrow();
        expect(incoming[0].position).toEqual({ x: 0, y: 0 });
    });
});

describe('reconcileLayout', () => {
    it('skips the layout pass when only the node data changed', () => {
        const { nodes } = reconcileLayout(makeIncomingNodes(), incomingEdges, 'TB', makeExistingLayout());

        expect(nodes.find((node) => node.id === 'main')?.position).toEqual({ x: 1200, y: 640 });
    });

    it('produces a different result than a full layout pass would', () => {
        const reconciled = reconcileLayout(makeIncomingNodes(), incomingEdges, 'TB', makeExistingLayout());
        const laidOut = getLayoutedElements(makeIncomingNodes(), incomingEdges, 'TB');

        expect(reconciled.nodes[0].position).not.toEqual(laidOut.nodes[0].position);
    });

    it('runs the full layout pass when the structure changed', () => {
        const withExtraNode = [
            ...makeIncomingNodes(),
            { id: 'added', type: 'customFlowNode', position: { x: 0, y: 0 }, data: {} } as CustomNode,
        ];

        const { nodes } = reconcileLayout(withExtraNode, incomingEdges, 'TB', makeExistingLayout());

        expect(nodes.find((node) => node.id === 'main')?.position).not.toEqual({ x: 1200, y: 640 });
    });

    it('runs the full layout pass when the direction changed', () => {
        const { nodes } = reconcileLayout(makeIncomingNodes(), incomingEdges, 'LR', makeExistingLayout());

        expect(nodes.find((node) => node.id === 'main')?.position).not.toEqual({ x: 1200, y: 640 });
        expect(nodes[0].sourcePosition).toBe(Position.Right);
    });

    it('lays out a first-time flowchart', () => {
        const { nodes } = reconcileLayout(makeIncomingNodes(), incomingEdges, 'TB', undefined);

        expect(nodes.some((node) => node.position.x !== 0 || node.position.y !== 0)).toBe(true);
    });
});
