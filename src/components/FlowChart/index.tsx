import Widget from 'components/Widget';
import { useTheme } from 'components/ThemeProvider';
import dagre from 'dagre';
import { useEffect, useMemo } from 'react';

import { actions as userInterfaceActions, selectors as userInterfaceSelectors } from 'ducks/user-interface';
import { useDispatch, useSelector } from 'react-redux';

import * as ReactFlowLib from 'reactflow';
import type { Edge, EdgeChange, Node, NodeChange, Viewport } from 'reactflow';
import 'reactflow/dist/style.css';
import type { CustomNodeData } from 'types/flowchart';
import type { Dispatch } from '@reduxjs/toolkit';
import FloatingEdge from './CustomEdge';
import CustomFlowNode from './CustomFlowNode';
import LegendComponent from './LegendWidget';
const nodeTypes = { customFlowNode: CustomFlowNode };

export interface CustomNode extends Node {
    data: CustomNodeData;
}

export interface LegendItem {
    icon: string;
    label: string;
    color: string;
    onClick?: () => void;
}

export type FlowDirection = 'TB' | 'BT' | 'LR' | 'RL' | 'STAR';

export interface FlowChartProps {
    flowChartTitle?: string;
    flowDirection?: FlowDirection;
    flowChartNodes: CustomNode[];
    flowChartEdges: Edge[];
    defaultViewport?: Viewport;
    busy?: boolean;
    legends?: LegendItem[];
}

const edgeTypes = {
    floating: FloatingEdge,
};
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

export const nodeWidth = 400;
export const nodeHeight = 100;

const CANVAS_BACKGROUND_COLORS = {
    light: '#d4d4d4',
    dark: '#404040',
} as const;

export const getLayoutedElements = (nodes: CustomNode[], edges: Edge[], direction = 'TB') => {
    const baseNodes: CustomNode[] = nodes.map((node) => ({
        ...node,
        position: node.position ? { ...node.position } : { x: 0, y: 0 },
        data: { ...node.data },
    }));

    if (direction === 'STAR') {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const minRadius = 250; // Minimum radius
        const mainNode = baseNodes.find((node) => node.data.isMainNode);
        const surroundingNodes = baseNodes.filter((node) => !node.data.isMainNode && !node.hidden);
        const angleIncrement = (2 * Math.PI) / Math.max(surroundingNodes.length, 1);

        // Calculate dynamic radius based on the number of nodes to ensure minimum distance of 200px
        let dynamicRadius = surroundingNodes.length * 60; // Example calculation, adjust as needed
        dynamicRadius = Math.max(dynamicRadius, minRadius); // Ensure radius is not less than minRadius
        let mainNodePosition = { x: 0, y: 0 };
        if (mainNode) {
            const currentNodeHeight = mainNode.data?.description ? nodeHeight + 35 : nodeHeight;
            // Position the main node at the center
            const mainPosition = { x: centerX - nodeWidth / 2, y: centerY - currentNodeHeight / 2 };
            mainNode.position = mainPosition;
            mainNodePosition = mainPosition;
        }

        const someGroupedNodes = surroundingNodes.some((node) => node.data.group);

        if (someGroupedNodes) {
            const nodesByGroups = surroundingNodes.reduce(
                (acc, node) => {
                    if (node.data.group) {
                        acc[node.data.group] = acc[node.data.group] || [];
                        acc[node.data.group].push(node);
                    } else {
                        acc.nonGrouped = acc.nonGrouped || [];
                        acc.nonGrouped.push(node);
                    }
                    return acc;
                },
                {} as Record<string, CustomNode[]>,
            );

            // Assuming mainNodePosition is the position of the main node
            const radius = 450; // Distance from the main node
            const groupKeys = Object.keys(nodesByGroups);
            const groupAngleIncrement = (2 * Math.PI) / Math.max(groupKeys.length, 1); // Divide the circle based on the number of groups

            groupKeys.forEach((groupKey, index) => {
                const angle = groupAngleIncrement * index;
                const groupPosition = {
                    x: mainNodePosition.x + radius * 1.75 * Math.cos(angle),
                    y: mainNodePosition.y + radius * Math.sin(angle),
                };

                // Position each node in the group around the group's central position
                nodesByGroups[groupKey].forEach((node, nodeIndex) => {
                    const nodeAngle = ((2 * Math.PI) / Math.max(nodesByGroups[groupKey].length, 1)) * nodeIndex;
                    const nodeRadius = 125 * (nodesByGroups[groupKey].length * 0.3); // Smaller radius for nodes within a group
                    const onlyTwoNodes = nodesByGroups[groupKey].length === 2;
                    let yOffset = 0;
                    if (onlyTwoNodes && nodeIndex === 1) {
                        yOffset = 105;
                    }
                    node.position = {
                        x: groupPosition.x + nodeRadius * 1.75 * Math.cos(nodeAngle),
                        y: groupPosition.y + nodeRadius * Math.sin(nodeAngle) + yOffset,
                    };
                });
            });
        } else {
            surroundingNodes.forEach((node, index) => {
                // Calculate the angle for the current node
                const angle = angleIncrement * index;
                const currentNodeHeight = node.data?.description ? nodeHeight + 35 : nodeHeight;

                // Calculate and set the position for each surrounding node using the dynamic radius
                node.position = {
                    x: centerX + dynamicRadius * Math.cos(angle) - nodeWidth / 2,
                    y: centerY + dynamicRadius * Math.sin(angle) - currentNodeHeight / 2,
                };
                node.targetPosition = ReactFlowLib.Position.Top;
                node.sourcePosition = ReactFlowLib.Position.Bottom;
            });
        }
        return { nodes: baseNodes, edges };
    } else {
        const isHorizontal = direction === 'LR';
        dagreGraph.setGraph({ rankdir: direction });

        baseNodes.forEach((node) => {
            const currentNodeHeight = node.data?.description ? nodeHeight + 35 : nodeHeight;
            dagreGraph.setNode(node.id, { width: nodeWidth, height: currentNodeHeight });
        });

        edges.forEach((edge) => {
            dagreGraph.setEdge(edge.source, edge.target);
        });

        dagre.layout(dagreGraph);

        const updatedNodes = baseNodes.map((node: CustomNode) => {
            const nodeWithPosition = dagreGraph.node(node.id);
            const currentNodeHeight = node.data?.description ? nodeHeight + 35 : nodeHeight;
            return {
                ...node,
                targetPosition: isHorizontal ? ReactFlowLib.Position.Left : ReactFlowLib.Position.Top,
                sourcePosition: isHorizontal ? ReactFlowLib.Position.Right : ReactFlowLib.Position.Bottom,
                position: {
                    x: nodeWithPosition.x - nodeWidth / 2,
                    y: nodeWithPosition.y - currentNodeHeight / 2,
                },
            };
        });

        return { nodes: updatedNodes, edges };
    }
};

export interface ExistingFlowLayout {
    nodes?: CustomNode[];
    edges?: Edge[];
    flowDirection?: FlowDirection;
}

// Everything getLayoutedElements reads off a node when it plots one: dagre sizes it by whether it
// carries a description, and the STAR pass centres on isMainNode and rings the rest by group. Ids
// alone are not enough, because an id survives a node changing any of those.
const nodeLayoutSignature = (node: CustomNode) =>
    [node.id, node.data?.isMainNode ? 'main' : '', node.data?.group ?? '', node.data?.description ? 'described' : ''].join('|');

// Dagre ranks by the wiring, not by edge identity, and ids such as `e1-chain-0` are positional — the
// same id can point at a different pair after the underlying collection changes.
const edgeLayoutSignature = (edge: Edge) => [edge.id, edge.source, edge.target].join('|');

// The transform hooks rebuild the nodes and edges on every render of the page that owns the chart,
// so the layout effect fires again for a flowchart that is already on screen. Only its shape decides
// whether the positions still hold: same layout signatures and same direction means the previous
// layout is still valid and the dagre/star pass can be skipped.
//
// `hidden` is deliberately not part of the signature. It is the one layout input the on-screen chart
// owns rather than the incoming data — it tracks which children the user has expanded — so folding it
// in would force a full re-plot on every expand and move the nodes out from under them.
export const canReuseLayout = (
    nodes: CustomNode[],
    edges: Edge[],
    direction: FlowDirection | undefined,
    existing: ExistingFlowLayout | undefined,
): boolean => {
    if (!existing?.nodes?.length || !existing.edges) return false;
    if (existing.flowDirection !== direction) return false;
    if (existing.nodes.length !== nodes.length || existing.edges.length !== edges.length) return false;

    const existingNodes = new Set(existing.nodes.map(nodeLayoutSignature));
    if (!nodes.every((node) => existingNodes.has(nodeLayoutSignature(node)))) return false;

    const existingEdges = new Set(existing.edges.map(edgeLayoutSignature));
    return edges.every((edge) => existingEdges.has(edgeLayoutSignature(edge)));
};

// The lighter path: take the fresh node data (labels, statuses, callbacks) but keep everything the
// on-screen layout owns — the plotted positions, the handle orientation, and which children the user
// has expanded, none of which the incoming nodes know about.
export const replotExistingLayout = (nodes: CustomNode[], edges: Edge[], existing: ExistingFlowLayout) => {
    const existingNodes = new Map((existing.nodes ?? []).map((node) => [node.id, node]));

    return {
        nodes: nodes.map((node) => {
            const existingNode = existingNodes.get(node.id);
            return {
                ...node,
                position: { ...(existingNode?.position ?? node.position) },
                sourcePosition: existingNode?.sourcePosition ?? node.sourcePosition,
                targetPosition: existingNode?.targetPosition ?? node.targetPosition,
                hidden: existingNode?.hidden ?? node.hidden,
                data: { ...node.data },
            };
        }),
        edges,
    };
};

export const reconcileLayout = (
    nodes: CustomNode[],
    edges: Edge[],
    direction: FlowDirection | undefined,
    existing: ExistingFlowLayout | undefined,
) =>
    existing && canReuseLayout(nodes, edges, direction, existing)
        ? replotExistingLayout(nodes, edges, existing)
        : getLayoutedElements(nodes, edges, direction);

export const createOnNodesChange = (dispatch: Dispatch, flowChartNodesState?: CustomNode[]) => {
    return (changes: NodeChange[]) => {
        const newNodes = ReactFlowLib.applyNodeChanges(changes, flowChartNodesState ?? []);
        dispatch(userInterfaceActions.updateReactFlowNodes(newNodes));
    };
};

export const createOnEdgesChange = (dispatch: Dispatch, flowChartEdgesState?: Edge[]) => {
    return (changes: EdgeChange[]) => {
        const newEdges = ReactFlowLib.applyEdgeChanges(changes, flowChartEdgesState ?? []);
        dispatch(userInterfaceActions.updateReactFlowEdges(newEdges));
    };
};

const FlowChartContent = ({
    flowChartTitle,
    flowChartEdges,
    flowChartNodes,
    defaultViewport,
    busy,
    flowDirection,
    legends,
}: FlowChartProps) => {
    const defaultEdgeOptions = { animated: true };
    const { resolvedTheme } = useTheme();
    const flowChartNodesState = useSelector(userInterfaceSelectors.flowChartNodes);
    const flowChartEdgesState = useSelector(userInterfaceSelectors.flowChartEdges);
    const flowDirectionState = useSelector(userInterfaceSelectors.flowDirection);
    const dispatch = useDispatch();

    const onNodesChange = useMemo(() => createOnNodesChange(dispatch, flowChartNodesState), [dispatch, flowChartNodesState]);
    const onEdgesChange = useMemo(() => createOnEdgesChange(dispatch, flowChartEdgesState), [dispatch, flowChartEdgesState]);

    // The stored layout is a starting point, not a trigger: this effect writes it, so depending on it would loop.
    // biome-ignore lint/correctness/useExhaustiveDependencies: reading the layout this effect itself writes
    useEffect(() => {
        if (!flowChartNodes.length) {
            dispatch(userInterfaceActions.clearReactFlowUI());
            return;
        }
        const { nodes, edges } = reconcileLayout(flowChartNodes, flowChartEdges, flowDirection, {
            nodes: flowChartNodesState,
            edges: flowChartEdgesState,
            flowDirection: flowDirectionState,
        });

        dispatch(
            userInterfaceActions.setReactFlowUI({
                flowChartNodes: nodes,
                flowChartEdges: edges,
                flowDirection,
            }),
        );
    }, [flowChartEdges, flowChartNodes, flowDirection, dispatch]);

    return (
        <Widget busy={busy}>
            {flowChartTitle && <h5 className="text-lg font-bold mb-4">{flowChartTitle}</h5>}
            <div className="w-full h-[70vh]">
                <ReactFlowLib.ReactFlow
                    nodes={flowChartNodesState ?? []}
                    proOptions={{ hideAttribution: true }}
                    edges={flowChartEdgesState ?? []}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    nodeTypes={nodeTypes}
                    fitView={!defaultViewport}
                    defaultViewport={defaultViewport}
                    defaultEdgeOptions={defaultEdgeOptions}
                    edgeTypes={edgeTypes}
                >
                    <ReactFlowLib.Controls />
                    <ReactFlowLib.Background
                        variant={ReactFlowLib.BackgroundVariant.Dots}
                        gap={16}
                        size={1}
                        color={CANVAS_BACKGROUND_COLORS[resolvedTheme]}
                    />
                </ReactFlowLib.ReactFlow>
            </div>

            {legends && <LegendComponent legends={legends} />}
        </Widget>
    );
};

const FlowChart = (props: FlowChartProps) => (
    <ReactFlowLib.ReactFlowProvider>
        <FlowChartContent {...props} />
    </ReactFlowLib.ReactFlowProvider>
);

export default FlowChart;
