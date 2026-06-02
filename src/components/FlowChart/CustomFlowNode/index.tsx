import cn from 'classnames';
import { actions as alertActions } from 'ducks/alerts';
import { actions as userInterfaceActions, selectors as userInterfaceSelectors } from 'ducks/user-interface';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router';
import { Handle, Position } from 'reactflow';
import Button from 'components/Button';
import type { EntityNodeProps } from 'types/flowchart';
import { CertificateValidationStatus } from 'types/openapi';
import { useCopyToClipboard } from 'utils/common-hooks';
import {
    Plus,
    Minus,
    Trash2,
    Copy,
    ArrowDown,
    ArrowUp,
    Award,
    FileText,
    User,
    KeyRound,
    Users,
    CreditCard,
    Stamp,
    MapPin,
    Rocket,
    Book,
    Filter,
    Zap,
    Settings,
    Eye,
    EyeOff,
} from 'lucide-react';

function CertificateIcon({ size = 24, className }: Readonly<{ size?: number; className?: string }>) {
    return (
        <svg
            className={cn('certificate-icon', className)}
            width={size}
            height={size}
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M1.86093 6.61521C1.71498 5.95774 1.73739 5.27406 1.92609 4.62755C2.1148 3.98105 2.46368 3.39266 2.9404 2.91694C3.41712 2.44121 4.00625 2.09356 4.65314 1.90621C5.30004 1.71886 5.98377 1.69788 6.64093 1.84521C7.00264 1.27952 7.50094 0.813974 8.08989 0.4915C8.67883 0.169027 9.33948 0 10.0109 0C10.6824 0 11.343 0.169027 11.932 0.4915C12.5209 0.813974 13.0192 1.27952 13.3809 1.84521C14.0391 1.69724 14.724 1.71812 15.3719 1.90593C16.0199 2.09373 16.6098 2.44236 17.0868 2.91937C17.5638 3.39638 17.9124 3.98629 18.1002 4.63422C18.288 5.28215 18.3089 5.96705 18.1609 6.62521C18.7266 6.98692 19.1922 7.48522 19.5146 8.07417C19.8371 8.66311 20.0061 9.32376 20.0061 9.99521C20.0061 10.6667 19.8371 11.3273 19.5146 11.9163C19.1922 12.5052 18.7266 13.0035 18.1609 13.3652C18.3083 14.0224 18.2873 14.7061 18.0999 15.353C17.9126 15.9999 17.5649 16.589 17.0892 17.0657C16.6135 17.5425 16.0251 17.8914 15.3786 18.0801C14.7321 18.2688 14.0484 18.2912 13.3909 18.1452C13.0297 18.7131 12.531 19.1806 11.9411 19.5045C11.3511 19.8284 10.689 19.9983 10.0159 19.9983C9.34291 19.9983 8.68076 19.8284 8.09081 19.5045C7.50086 19.1806 7.00217 18.7131 6.64093 18.1452C5.98377 18.2925 5.30004 18.2716 4.65314 18.0842C4.00625 17.8969 3.41712 17.5492 2.9404 17.0735C2.46368 16.5978 2.1148 16.0094 1.92609 15.3629C1.73739 14.7164 1.71498 14.0327 1.86093 13.3752C1.29089 13.0145 0.821349 12.5154 0.495984 11.9244C0.170618 11.3335 0 10.6698 0 9.99521C0 9.32061 0.170618 8.65696 0.495984 8.066C0.821349 7.47504 1.29089 6.97597 1.86093 6.61521Z"
                fill="currentColor"
            />
        </svg>
    );
}

export default function CustomFlowNode({ data, dragging, selected, xPos, yPos, id }: Readonly<EntityNodeProps>) {
    const [isNodeExpanded, setIsNodeExpanded] = useState(data.expandedByDefault ?? false);
    const [addNodeContentCollapse, setAddNodeContentCollapse] = useState(false);

    const flowChartNoedesState = useSelector(userInterfaceSelectors.flowChartNodes);
    const expandedHiddenNodeId = useSelector(userInterfaceSelectors.expandedHiddenNodeId);

    const thisNodeState = useMemo(() => {
        return flowChartNoedesState?.find((node) => node?.id === id);
    }, [flowChartNoedesState, id]);

    const hasHiddenChildren = useMemo(() => {
        return flowChartNoedesState?.some((node) => node?.parentId === id && node.hidden !== undefined);
    }, [flowChartNoedesState, id]);
    const dispatch = useDispatch();

    const toggleHiddenNodes = useCallback(() => {
        if (expandedHiddenNodeId === id) {
            const updatedNodes = flowChartNoedesState?.map((node) => {
                if (node?.parentId === id && node.hidden !== undefined) {
                    return {
                        ...node,
                        hidden: true,
                    };
                }
                return node;
            });

            if (updatedNodes) dispatch(userInterfaceActions.updateReactFlowNodes(updatedNodes));

            dispatch(userInterfaceActions.setShowHiddenNodes(undefined));
        } else {
            const updatedNodes = flowChartNoedesState?.map((node, i) => {
                const totalNodes = flowChartNoedesState?.filter((node) => node.parentId === id).length || 1; // Total child nodes

                const multiplier = totalNodes < 3 ? 300 : 200;
                const nodeRadius = multiplier * (totalNodes * 0.3); // Smaller radius for nodes within a group
                const nodeAngle = ((2 * Math.PI) / totalNodes) * i;

                if (node?.parentId !== id && node.hidden === false) {
                    return {
                        ...node,
                        hidden: true,
                    };
                }

                if (node?.parentId === id && node.hidden !== undefined) {
                    const positionMultiplier = totalNodes < 2 ? 3.5 : 1.75;
                    const xPosition = nodeRadius * positionMultiplier * Math.cos(nodeAngle);
                    const xWithExpandedOffset = isNodeExpanded && xPosition > 0 ? xPosition + 350 : xPosition;
                    const position = {
                        x: xWithExpandedOffset,
                        y: nodeRadius * positionMultiplier * Math.sin(nodeAngle),
                    };

                    return {
                        ...node,
                        position: position,
                        hidden: false,
                    };
                }
                return node;
            });

            if (updatedNodes) dispatch(userInterfaceActions.updateReactFlowNodes(updatedNodes));

            dispatch(userInterfaceActions.setShowHiddenNodes(id));
        }
    }, [flowChartNoedesState, dispatch, id, expandedHiddenNodeId, isNodeExpanded]);

    const expandToggle = useCallback(() => {
        setIsNodeExpanded(!isNodeExpanded);
    }, [isNodeExpanded]);

    const copyToClipboard = useCopyToClipboard();

    useEffect(() => {
        if (isNodeExpanded && data?.expandAction) data.expandAction();
    }, [data, isNodeExpanded]);

    const getIconComponent = () => {
        if (!data.icon) return null;
        // Normalize icon string (remove extra spaces, handle both 'fa fa-icon' and 'fa-icon' formats)
        const normalizedIcon = data.icon.trim().replaceAll(/\s+/g, ' ');

        // Map FontAwesome icon classes to Lucide icons
        const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
            'fa-medal': Award,
            'fa fa-medal': Award,
            'fa-user': User,
            'fa fa-user': User,
            'fa fa fa-user': User,
            'fa-key': KeyRound,
            'fa fa-key': KeyRound,
            'fa fa fa-key': KeyRound,
            'fa-users': Users,
            'fa fa-users': Users,
            'fa fa fa-users': Users,
            'fa-address-card': CreditCard,
            'fa fa-address-card': CreditCard,
            'fa fa fa-address-card': CreditCard,
            'fa-stamp': Stamp,
            'fa fa-stamp': Stamp,
            'fa fa fa-stamp': Stamp,
            'fa-map-marker': MapPin,
            'fa fa-map-marker': MapPin,
            'fa fa fa-map-marker': MapPin,
            'fa-rocket': Rocket,
            'fa fa-rocket': Rocket,
            'fa-book': Book,
            'fa fa-book': Book,
            'fa-filter': Filter,
            'fa fa-filter': Filter,
            'fa-bolt': Zap,
            'fa fa-bolt': Zap,
            'fa-cogs': Settings,
            'fa fa-cogs': Settings,
            'fa-certificate': CertificateIcon,
            'fa fa-certificate': CertificateIcon,
        };

        const IconComponent = iconMap[normalizedIcon];

        if (!IconComponent) {
            // Default to FileText if icon not found
            return <FileText size={24} className={getStatusClasses()} />;
        }

        return <IconComponent size={24} className={getStatusClasses()} />;
    };

    const getStatusClasses = () => {
        switch (data?.certificateNodeData?.certificateNodeValidationStatus) {
            case CertificateValidationStatus.Valid:
                return 'text-green-700 border-green-700 [&_.certificate-icon]:text-green-700';
            case CertificateValidationStatus.Expired:
                return 'text-red-500 border-red-500';
            case CertificateValidationStatus.Revoked:
                return 'text-[#632828] border-[#632828]';
            case CertificateValidationStatus.Invalid:
                return 'text-gray-900 border-gray-900 border-2';
            case CertificateValidationStatus.NotChecked:
                return 'text-blue-600 border-blue-600';
            case CertificateValidationStatus.Inactive:
                return 'text-gray-500 border-gray-500';
            case CertificateValidationStatus.Expiring:
                return 'text-yellow-500 border-yellow-500';
            case CertificateValidationStatus.Failed:
                return 'text-[#9c0012] border-[#9c0012]';
        }

        switch (data?.group) {
            case 'rules':
                return 'text-blue-600 border-blue-600';
            case 'actions':
                return 'text-green-700 border-green-700 [&_.certificate-icon]:text-green-700';
        }

        return 'text-indigo-300 border-indigo-300';
    };

    const getExpandButtonStatusClasses = () => {
        switch (data?.certificateNodeData?.certificateNodeValidationStatus) {
            case CertificateValidationStatus.Valid:
                return '!bg-[#1ab3949f] !border-none hover:!bg-[#1ab394ec] active:!bg-[#1ab394d8]';
            case CertificateValidationStatus.Expired:
                return '!bg-[#ef4444a4] !border-none hover:!bg-red-500 active:!bg-red-500';
            case CertificateValidationStatus.Revoked:
                return '!bg-[#632828b7] !border-none hover:!bg-[#632828] active:!bg-[#632828]';
            case CertificateValidationStatus.Expiring:
                return '!bg-[#eab308a6] !border-none hover:!bg-[#eab308ec] active:!bg-[#eab308d8]';
            case CertificateValidationStatus.Invalid:
                return '!bg-[#131212a3] !border-none hover:!bg-[#131212ec] active:!bg-[#131212d8]';
            case CertificateValidationStatus.NotChecked:
                return '!bg-[#7fa2c1a1] !border-none hover:!bg-[#7fa2c1ec] active:!bg-[#7fa2c1d8]';
            case CertificateValidationStatus.Failed:
                return '!bg-[#9c0012a2] !border-none hover:!bg-[#9c0012ec] active:!bg-[#9c0012d8]';
            case CertificateValidationStatus.Inactive:
                return '!bg-[#6c757da0] !border-none hover:!bg-[#6c757dec] active:!bg-[#6c757dd8]';
        }
        switch (data?.group) {
            case 'rules':
                return '!bg-[#7fa2c1a1] !border-none hover:!bg-[#7fa2c1ec] active:!bg-[#7fa2c1d8]';
            case 'actions':
                return '!bg-[#1ab3949f] !border-none hover:!bg-[#1ab394ec] active:!bg-[#1ab394d8]';
        }

        return '!bg-indigo-300 !border-none hover:!bg-[#3754a5ec] active:!bg-[#3754a5d8]';
    };

    return (
        <>
            <Handle hidden={data.handleHide === 'target'} className="opacity-0" type="target" position={Position.Top} />
            <div className="flex items-start">
                <div
                    className={cn(
                        'relative bg-white p-2 pb-[0.9rem] rounded-[10px] flex flex-col items-start w-[400px] min-h-[55px] border-2 border-indigo-300 text-left z-[1] transition-[width] duration-300 ease-in-out',
                        { 'bg-gray-200': dragging },
                        { 'border-4': data.isMainNode },
                        { 'w-[242.5px]': data.group || thisNodeState?.hidden !== undefined },
                        getStatusClasses(),
                        { 'w-[600px]': isNodeExpanded },
                    )}
                >
                    {selected && (
                        <div className="absolute top-0 -right-10">
                            <div className="flex flex-col">
                                {data.otherProperties && (
                                    <Button
                                        color="primary"
                                        onClick={expandToggle}
                                        className={cn(
                                            '!rounded-full !w-[26px] !h-[26px] !p-0 !text-[10px]',
                                            getExpandButtonStatusClasses(),
                                        )}
                                    >
                                        <span className="sr-only">{isNodeExpanded ? 'Collapse' : 'Expand'}</span>
                                        {isNodeExpanded ? <ArrowUp width="100%" height="70%" /> : <ArrowDown width="100%" height="70%" />}
                                    </Button>
                                )}

                                {hasHiddenChildren ? (
                                    <span
                                        data-expanded={expandedHiddenNodeId === id ? 'true' : 'false'}
                                        data-testid="flow-node-toggle-hidden-wrap"
                                    >
                                        <Button
                                            color="primary"
                                            data-testid="flow-node-toggle-hidden"
                                            onClick={() => {
                                                toggleHiddenNodes();
                                            }}
                                            className={cn(
                                                'mt-1 !rounded-full !w-[26px] !h-[26px] !p-0 !text-[10px]',
                                                getExpandButtonStatusClasses(),
                                            )}
                                        >
                                            {expandedHiddenNodeId === id ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </Button>
                                    </span>
                                ) : null}
                                {data.addButtonContent && (
                                    <Button
                                        color="primary"
                                        data-testid="flow-node-add"
                                        className="mt-1 !rounded-full !w-[26px] !h-[26px] !p-0 !text-[10px] !bg-indigo-300 !border-none hover:!bg-[#3754a5ec] active:!bg-[#3754a5d8]"
                                        title="Add connections to this node"
                                        onClick={() => setAddNodeContentCollapse(!addNodeContentCollapse)}
                                    >
                                        {addNodeContentCollapse ? <Minus size={16} /> : <Plus size={16} />}
                                    </Button>
                                )}

                                {data.deleteAction && (
                                    <Button
                                        color="danger"
                                        data-testid="flow-node-delete"
                                        className="mt-1 !rounded-full !w-[26px] !h-[26px] !p-0 !text-[10px] !bg-[#e37582] !border-none hover:!bg-[#ef4444ec] active:!bg-[#ef4444d8]"
                                        onClick={() => {
                                            if (data.deleteAction) {
                                                if (data.deleteAction.disableCondition === 'SingleChild') {
                                                    const totalSiblings = flowChartNoedesState?.filter(
                                                        (node) =>
                                                            node.parentId === thisNodeState?.parentId &&
                                                            node.id !== id &&
                                                            node.parentId !== undefined,
                                                    ).length;
                                                    if (totalSiblings === 0) {
                                                        dispatch(
                                                            alertActions.error(
                                                                data.deleteAction.disabledMessage ||
                                                                    'Cannot delete the last node of this group',
                                                            ),
                                                        );
                                                        return;
                                                    }
                                                }

                                                data.deleteAction.action();
                                                const childrenNodes = flowChartNoedesState?.filter((node) => node.parentId === id);
                                                childrenNodes?.forEach((node) => {
                                                    dispatch(userInterfaceActions.deleteNode(node.id));
                                                });
                                                dispatch(userInterfaceActions.deleteNode(id));
                                            }
                                        }}
                                        title="Delete this node"
                                    >
                                        <Trash2 size={16} className="text-white" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                    <div className="flex items-center mb-2">
                        <div className="mr-2">{getIconComponent()}</div>
                        <h6 className="text-[var(--dark-gray-color)] font-bold text-lg">{data.customNodeCardTitle}</h6>
                    </div>

                    {data.entityLabel ? (
                        <div className="flex font-medium text-[#64748b] [&>*]:min-w-0 [&>*]:flex-shrink [&>*]:break-words">
                            <h6>Entity Name:</h6>
                            &nbsp;
                            {data.redirectUrl ? (
                                <Link to={data.redirectUrl} className="text-[var(--primary-blue-color)] font-semibold">
                                    <h6 className="text-wrap">{data.entityLabel}</h6>
                                </Link>
                            ) : (
                                <h6>{data.entityLabel}</h6>
                            )}
                        </div>
                    ) : (
                        <div className="mt-4" />
                    )}
                    {data.description && (
                        <div className="flex font-medium text-[#64748B]">
                            <h6>Description:</h6>
                            &nbsp;
                            <h6>{data.description}</h6>
                        </div>
                    )}

                    {data.otherProperties && (
                        <div className={cn('w-full py-2', { hidden: !isNodeExpanded })}>
                            <div
                                className="max-h-[150px] overflow-auto w-full [scrollbar-width:thin] [scrollbar-color:#9ca3af_#e5e7eb] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:bg-gray-400 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-track]:bg-gray-200 [&::-webkit-scrollbar-track]:rounded"
                                onWheelCapture={(e) => {
                                    // Prevent React Flow from capturing the wheel event so inner table can scroll
                                    e.stopPropagation();
                                }}
                            >
                                <div className="border border-gray-100 rounded-md">
                                    <div className="min-w-full inline-block align-middle">
                                        {/* header */}
                                        <div className="grid grid-cols-3 bg-[#F8FAFC] text-xs font-medium text-gray-500 uppercase px-3 py-2 rounded-t-md">
                                            <div className="col-span-1">Property</div>
                                            <div className="col-span-2">Value</div>
                                        </div>
                                        {/* rows */}
                                        <div className="divide-y divide-gray-100 bg-white rounded-b-md">
                                            {data.otherProperties.map((property, index) => {
                                                const valueContent = (
                                                    <div className="flex items-center gap-2 break-all whitespace-normal">
                                                        {property?.propertyValue && <span>{property.propertyValue}</span>}
                                                        {property?.copyable && property?.propertyValue && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (typeof property.propertyValue === 'string') {
                                                                        copyToClipboard(
                                                                            property.propertyValue,
                                                                            `${property.propertyName} copied to clipboard`,
                                                                            `Failed to copy ${property.propertyName} to clipboard`,
                                                                        );
                                                                    }
                                                                }}
                                                                className="cursor-pointer inline-flex items-center appearance-none border-0 bg-transparent p-0 text-inherit"
                                                                aria-label={`Copy ${property.propertyName}`}
                                                                title={`Copy ${property.propertyName}`}
                                                            >
                                                                <Copy size={14} />
                                                            </button>
                                                        )}
                                                        {property?.propertyContent && <>{property.propertyContent}</>}
                                                    </div>
                                                );

                                                return (
                                                    <div
                                                        key={property?.propertyName ?? `prop-row-${index}`}
                                                        className="grid grid-cols-3 px-3 py-2 text-sm text-gray-800"
                                                    >
                                                        <div className="col-span-1 font-medium text-[#64748B]">
                                                            {property?.propertyName || ''}
                                                        </div>
                                                        <div className="col-span-2">{valueContent}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {data?.formContent && (
                        <div className="m-auto" style={{ minWidth: '500px' }}>
                            {data.formContent}
                        </div>
                    )}

                    <div hidden={!addNodeContentCollapse}>
                        <div className="bg-white p-2 pb-[0.9rem] rounded-[10px] flex flex-col items-start w-[350px] min-h-[55px] text-left z-[2]">
                            {data.addButtonContent}
                        </div>
                    </div>
                </div>
            </div>

            <Handle hidden={data.handleHide === 'source'} className="opacity-0" type="source" position={Position.Bottom} id="a" />
        </>
    );
}
