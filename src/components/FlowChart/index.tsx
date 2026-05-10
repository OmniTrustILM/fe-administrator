import Widget from 'components/Widget';
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

export interface FlowChartProps {
    flowChartTitle?: string;
    flowDirection?: 'TB' | 'BT' | 'LR' | 'RL' | 'STAR';
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
    const flowChartNodesState = useSelector(userInterfaceSelectors.flowChartNodes);
    const flowChartEdgesState = useSelector(userInterfaceSelectors.flowChartEdges);
    const dispatch = useDispatch();

    const onNodesChange = useMemo(() => createOnNodesChange(dispatch, flowChartNodesState), [dispatch, flowChartNodesState]);
    const onEdgesChange = useMemo(() => createOnEdgesChange(dispatch, flowChartEdgesState), [dispatch, flowChartEdgesState]);

    useEffect(() => {
        if (!flowChartNodes.length) {
            dispatch(userInterfaceActions.clearReactFlowUI());
            return;
        }
        let layoutedElements: { nodes: CustomNode[]; edges: Edge[] } | undefined;
        try {
            // TODO : Implement another separate plotting function for already created flowchart
            layoutedElements = getLayoutedElements(flowChartNodes, flowChartEdges, flowDirection);
        } catch (e) {
            // TODO: Prevent the const assignment error from happening
            console.log(e);
            layoutedElements = undefined;
        }

        if (!layoutedElements) {
            // Handle the case where getLayoutedElements returns undefined
            dispatch(userInterfaceActions.clearReactFlowUI());
            return;
        }

        const { nodes = [], edges = [] } = layoutedElements;

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
                    <ReactFlowLib.Background variant={ReactFlowLib.BackgroundVariant.Dots} gap={16} size={1} />
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
