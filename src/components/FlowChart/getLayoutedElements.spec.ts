import { describe, expect, it } from 'vitest';
import { type CustomNode, getLayoutedElements } from 'components/FlowChart';
import type { Edge } from 'reactflow';

// Recursively Object.freeze an object graph, mimicking how Redux Toolkit / Immer
// freeze state in development. Before getLayoutedElements cloned its inputs, the
// layout code mutated these frozen nodes directly and threw a TypeError in strict
// mode — the error the old try/catch + console.log was swallowing.
const deepFreeze = <T>(value: T): T => {
    if (value && typeof value === 'object') {
        Object.values(value).forEach(deepFreeze);
        Object.freeze(value);
    }
    return value;
};

const makeFrozenNodes = (): CustomNode[] =>
    deepFreeze([
        { id: 'main', type: 'customFlowNode', position: { x: 0, y: 0 }, data: { isMainNode: true } },
        { id: 'a', type: 'customFlowNode', position: { x: 0, y: 0 }, data: { group: 'g1' } },
        { id: 'b', type: 'customFlowNode', position: { x: 0, y: 0 }, data: { group: 'g1' } },
    ]);

const frozenEdges: Edge[] = deepFreeze([{ id: 'e1', source: 'main', target: 'a' }]);

describe('getLayoutedElements with frozen (Redux-style) inputs', () => {
    it('does not throw for the dagre layout (TB) when nodes are frozen', () => {
        const nodes = makeFrozenNodes();
        expect(() => getLayoutedElements(nodes, frozenEdges, 'TB')).not.toThrow();
    });

    it('does not throw for the STAR layout when nodes are frozen', () => {
        const nodes = makeFrozenNodes();
        expect(() => getLayoutedElements(nodes, frozenEdges, 'STAR')).not.toThrow();
    });

    it('leaves the original frozen nodes untouched (proves it works on clones)', () => {
        const nodes = makeFrozenNodes();
        const { nodes: laidOut } = getLayoutedElements(nodes, frozenEdges, 'TB');

        // Inputs are unchanged...
        expect(nodes.every((n) => n.position.x === 0 && n.position.y === 0)).toBe(true);
        // ...while the returned nodes got real positions and are different objects.
        expect(laidOut).not.toBe(nodes);
        expect(laidOut.some((n) => n.position.x !== 0 || n.position.y !== 0)).toBe(true);
    });
});
