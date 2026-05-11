import { test, expect } from '../../../playwright/ct-test';
import type { Edge } from 'reactflow';
import type { CustomNode, FlowChartProps } from './index';
import FlowChartMountWrapper from './FlowChartMountWrapper';

function buildNode(id: string, overrides: Partial<CustomNode> = {}): CustomNode {
    return {
        id,
        type: 'customFlowNode',
        position: { x: 0, y: 0 },
        data: {
            customNodeCardTitle: `Node ${id}`,
            ...(overrides.data ?? {}),
        },
        ...overrides,
    } as CustomNode;
}

function buildEdge(id: string, source: string, target: string): Edge {
    return {
        id,
        source,
        target,
        type: 'floating',
    };
}

test.describe('FlowChart', () => {
    test('renders title and legends', async ({ mount, page }) => {
        await mount(
            <FlowChartMountWrapper
                flowChartProps={{
                    flowChartTitle: 'Flow chart title',
                    flowChartNodes: [buildNode('main', { data: { customNodeCardTitle: 'Main', isMainNode: true } as any })],
                    flowChartEdges: [],
                    legends: [{ icon: 'fa fa-user', label: 'Users', color: '#000', onClick: () => {} }],
                }}
            />,
        );

        await expect(page.getByText('Flow chart title')).toBeVisible();
        await expect(page.locator('span', { hasText: 'Users' }).last()).toBeVisible();
    });

    test('uses default viewport when provided', async ({ mount, page }) => {
        await mount(
            <FlowChartMountWrapper
                flowChartProps={{
                    flowChartNodes: [buildNode('a')],
                    flowChartEdges: [],
                    defaultViewport: { x: 10, y: 20, zoom: 1.5 },
                }}
            />,
        );

        await expect(page.locator('.react-flow__viewport')).toHaveAttribute('style', /scale\(1\.5\)/);
    });

    test('renders empty chart when flowChartNodes is empty', async ({ mount, page }) => {
        await mount(<FlowChartMountWrapper flowChartProps={{ flowChartNodes: [], flowChartEdges: [] }} />);
        await expect(page.locator('.react-flow__node')).toHaveCount(0);
    });

    test('applies TB layout and renders nodes', async ({ mount, page }) => {
        const nodes = [
            buildNode('main', { data: { customNodeCardTitle: 'Main', isMainNode: true } as any }),
            buildNode('child', { data: { customNodeCardTitle: 'Child', description: 'desc' } as any }),
        ];
        const edges = [buildEdge('e1', 'main', 'child')];

        await mount(
            <FlowChartMountWrapper
                flowChartProps={{
                    flowChartNodes: nodes,
                    flowChartEdges: edges,
                    flowDirection: 'TB',
                }}
            />,
        );

        await expect(page.getByText('Main')).toBeVisible();
        await expect(page.getByText('Child')).toBeVisible();
    });

    test('applies LR layout branch', async ({ mount, page }) => {
        await mount(
            <FlowChartMountWrapper
                flowChartProps={{
                    flowChartNodes: [buildNode('a'), buildNode('b')],
                    flowChartEdges: [buildEdge('e1', 'a', 'b')],
                    flowDirection: 'LR',
                }}
            />,
        );

        await expect(page.getByTestId('rf__node-a')).toBeVisible();
        await expect(page.getByTestId('rf__node-b')).toBeVisible();
    });

    test('applies STAR layout for grouped nodes', async ({ mount, page }) => {
        await mount(
            <FlowChartMountWrapper
                flowChartProps={{
                    flowDirection: 'STAR',
                    flowChartNodes: [
                        buildNode('main', { data: { customNodeCardTitle: 'Main', isMainNode: true, description: 'main' } as any }),
                        buildNode('g1', { data: { customNodeCardTitle: 'G1', group: 'rules' } as any }),
                        buildNode('g2', { data: { customNodeCardTitle: 'G2', group: 'rules' } as any }),
                        buildNode('g3', { data: { customNodeCardTitle: 'G3', group: 'actions' } as any }),
                        buildNode('ng', { data: { customNodeCardTitle: 'No Group' } as any }),
                    ],
                    flowChartEdges: [],
                }}
            />,
        );

        await expect(page.getByTestId('rf__node-main')).toBeVisible();
        await expect(page.getByTestId('rf__node-g1')).toBeVisible();
        await expect(page.getByTestId('rf__node-g2')).toBeVisible();
        await expect(page.getByTestId('rf__node-g3')).toBeVisible();
        await expect(page.getByTestId('rf__node-ng')).toBeVisible();
    });

    test('applies STAR layout for non-grouped nodes', async ({ mount, page }) => {
        await mount(
            <FlowChartMountWrapper
                flowChartProps={{
                    flowDirection: 'STAR',
                    flowChartNodes: [
                        buildNode('main', { data: { customNodeCardTitle: 'Main', isMainNode: true } as any }),
                        buildNode('n1', { data: { customNodeCardTitle: 'N1' } as any }),
                        buildNode('n2', { data: { customNodeCardTitle: 'N2', description: 'desc' } as any }),
                    ],
                    flowChartEdges: [],
                }}
            />,
        );

        await expect(page.getByText('Main')).toBeVisible();
        await expect(page.getByText('N1')).toBeVisible();
        await expect(page.getByText('N2')).toBeVisible();
    });

    test('renders without optional props', async ({ mount, page }) => {
        const props: FlowChartProps = {
            flowChartNodes: [buildNode('a')],
            flowChartEdges: [],
        };
        await mount(<FlowChartMountWrapper flowChartProps={props} />);
        await expect(page.getByTestId('rf__node-a')).toBeVisible();
    });
});
