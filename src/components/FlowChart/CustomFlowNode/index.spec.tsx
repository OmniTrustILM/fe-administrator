import { test, expect } from '../../../../playwright/ct-test';
import CustomFlowNodeMountWrapper from './CustomFlowNodeMountWrapper';
import type { CustomNodeData, EntityNodeProps, OtherProperties } from 'types/flowchart';
import { CertificateValidationStatus } from 'types/openapi';
import { testInitialState } from 'ducks/test-reducers';

const defaultData: CustomNodeData = {
    customNodeCardTitle: 'Test Node',
};

function buildProps(overrides: Partial<EntityNodeProps> & { data?: Partial<CustomNodeData> } = {}): EntityNodeProps {
    const { data: dataOverrides, ...rest } = overrides;
    return {
        id: 'node-1',
        type: 'default',
        data: { ...defaultData, ...dataOverrides },
        dragging: false,
        selected: false,
        xPos: 0,
        yPos: 0,
        ...rest,
    } as EntityNodeProps;
}

test.describe('CustomFlowNode', () => {
    test('renders node with title', async ({ mount }) => {
        const component = await mount(<CustomFlowNodeMountWrapper nodeProps={buildProps()} initialStoreState={testInitialState} />);
        await expect(component).toContainText('Test Node');
    });

    test('renders with dragging style', async ({ mount }) => {
        const component = await mount(<CustomFlowNodeMountWrapper nodeProps={buildProps({ dragging: true })} />);
        await expect(component.locator('.bg-gray-200').first()).toBeVisible();
    });

    test('renders with isMainNode border', async ({ mount }) => {
        const component = await mount(
            <CustomFlowNodeMountWrapper nodeProps={buildProps({ data: { ...defaultData, isMainNode: true } })} />,
        );
        await expect(component.locator('.border-4').first()).toBeVisible();
    });

    test('renders without icon when data.icon is not set', async ({ mount }) => {
        const component = await mount(<CustomFlowNodeMountWrapper nodeProps={buildProps()} />);
        await expect(component).toContainText('Test Node');
    });

    test('renders with fa-user icon', async ({ mount }) => {
        const component = await mount(<CustomFlowNodeMountWrapper nodeProps={buildProps({ data: { ...defaultData, icon: 'fa-user' } })} />);
        await expect(component).toContainText('Test Node');
    });

    test('renders with fa fa-user icon format', async ({ mount }) => {
        const component = await mount(
            <CustomFlowNodeMountWrapper nodeProps={buildProps({ data: { ...defaultData, icon: 'fa fa-user' } })} />,
        );
        await expect(component).toContainText('Test Node');
    });

    test('renders default FileText icon for unknown icon', async ({ mount }) => {
        const component = await mount(
            <CustomFlowNodeMountWrapper nodeProps={buildProps({ data: { ...defaultData, icon: 'fa-unknown' } })} />,
        );
        await expect(component).toContainText('Test Node');
    });

    test('renders entity label with redirectUrl as Link', async ({ mount }) => {
        const component = await mount(
            <CustomFlowNodeMountWrapper
                nodeProps={buildProps({
                    data: {
                        ...defaultData,
                        entityLabel: 'My Entity',
                        redirectUrl: '/entities/123',
                    },
                })}
            />,
        );
        await expect(component.getByText('Entity Name:')).toBeVisible();
        await expect(component.getByText('My Entity')).toBeVisible();
        await expect(component.locator('a[href="/entities/123"]')).toBeVisible();
    });

    test('renders entity label without redirectUrl', async ({ mount }) => {
        const component = await mount(
            <CustomFlowNodeMountWrapper nodeProps={buildProps({ data: { ...defaultData, entityLabel: 'Just Label' } })} />,
        );
        await expect(component.getByText('Entity Name:')).toBeVisible();
        await expect(component.getByText('Just Label')).toBeVisible();
    });

    test('renders description when provided', async ({ mount }) => {
        const component = await mount(
            <CustomFlowNodeMountWrapper nodeProps={buildProps({ data: { ...defaultData, description: 'Node description text' } })} />,
        );
        await expect(component.getByText('Description:')).toBeVisible();
        await expect(component.getByText('Node description text')).toBeVisible();
    });

    test('renders with group rules status classes', async ({ mount }) => {
        const component = await mount(<CustomFlowNodeMountWrapper nodeProps={buildProps({ data: { ...defaultData, group: 'rules' } })} />);
        await expect(component).toContainText('Test Node');
    });

    test('renders with group actions status classes', async ({ mount }) => {
        const component = await mount(
            <CustomFlowNodeMountWrapper nodeProps={buildProps({ data: { ...defaultData, group: 'actions' } })} />,
        );
        await expect(component).toContainText('Test Node');
    });

    test('renders certificate status Valid', async ({ mount }) => {
        const component = await mount(
            <CustomFlowNodeMountWrapper
                nodeProps={buildProps({
                    data: {
                        ...defaultData,
                        certificateNodeData: {
                            certificateNodeValidationStatus: CertificateValidationStatus.Valid,
                        },
                    },
                })}
            />,
        );
        await expect(component).toContainText('Test Node');
    });

    test('renders certificate status Expired', async ({ mount }) => {
        const component = await mount(
            <CustomFlowNodeMountWrapper
                nodeProps={buildProps({
                    data: {
                        ...defaultData,
                        certificateNodeData: {
                            certificateNodeValidationStatus: CertificateValidationStatus.Expired,
                        },
                    },
                })}
            />,
        );
        await expect(component).toContainText('Test Node');
    });

    test('renders certificate status Revoked', async ({ mount }) => {
        const component = await mount(
            <CustomFlowNodeMountWrapper
                nodeProps={buildProps({
                    data: {
                        ...defaultData,
                        certificateNodeData: {
                            certificateNodeValidationStatus: CertificateValidationStatus.Revoked,
                        },
                    },
                })}
            />,
        );
        await expect(component).toContainText('Test Node');
    });

    test('renders certificate status Invalid', async ({ mount }) => {
        const component = await mount(
            <CustomFlowNodeMountWrapper
                nodeProps={buildProps({
                    data: {
                        ...defaultData,
                        certificateNodeData: {
                            certificateNodeValidationStatus: CertificateValidationStatus.Invalid,
                        },
                    },
                })}
            />,
        );
        await expect(component).toContainText('Test Node');
    });

    test('renders certificate status NotChecked', async ({ mount }) => {
        const component = await mount(
            <CustomFlowNodeMountWrapper
                nodeProps={buildProps({
                    data: {
                        ...defaultData,
                        certificateNodeData: {
                            certificateNodeValidationStatus: CertificateValidationStatus.NotChecked,
                        },
                    },
                })}
            />,
        );
        await expect(component).toContainText('Test Node');
    });

    test('renders certificate status Inactive', async ({ mount }) => {
        const component = await mount(
            <CustomFlowNodeMountWrapper
                nodeProps={buildProps({
                    data: {
                        ...defaultData,
                        certificateNodeData: {
                            certificateNodeValidationStatus: CertificateValidationStatus.Inactive,
                        },
                    },
                })}
            />,
        );
        await expect(component).toContainText('Test Node');
    });

    test('renders certificate status Expiring', async ({ mount }) => {
        const component = await mount(
            <CustomFlowNodeMountWrapper
                nodeProps={buildProps({
                    data: {
                        ...defaultData,
                        certificateNodeData: {
                            certificateNodeValidationStatus: CertificateValidationStatus.Expiring,
                        },
                    },
                })}
            />,
        );
        await expect(component).toContainText('Test Node');
    });

    test('renders certificate status Failed', async ({ mount }) => {
        const component = await mount(
            <CustomFlowNodeMountWrapper
                nodeProps={buildProps({
                    data: {
                        ...defaultData,
                        certificateNodeData: {
                            certificateNodeValidationStatus: CertificateValidationStatus.Failed,
                        },
                    },
                })}
            />,
        );
        await expect(component).toContainText('Test Node');
    });

    test('selected node shows expand button when otherProperties present', async ({ mount }) => {
        const component = await mount(
            <CustomFlowNodeMountWrapper
                nodeProps={buildProps({
                    selected: true,
                    data: {
                        ...defaultData,
                        otherProperties: [{ propertyName: 'P1', propertyValue: 'V1' }],
                    },
                })}
            />,
        );
        const expandBtn = component.getByRole('button', { name: /Expand/i });
        await expect(expandBtn).toBeVisible();
    });

    test('expand button toggles to Collapse when clicked', async ({ mount }) => {
        const component = await mount(
            <CustomFlowNodeMountWrapper
                nodeProps={buildProps({
                    selected: true,
                    data: {
                        ...defaultData,
                        otherProperties: [{ propertyName: 'P1', propertyValue: 'V1' }],
                    },
                })}
            />,
        );
        await component.getByRole('button', { name: /Expand/i }).click();
        await expect(component.getByRole('button', { name: /Collapse/i })).toBeVisible();
    });

    test('otherProperties table shows property name and value', async ({ mount }) => {
        const component = await mount(
            <CustomFlowNodeMountWrapper
                nodeProps={buildProps({
                    selected: true,
                    data: {
                        ...defaultData,
                        otherProperties: [{ propertyName: 'Key', propertyValue: 'Value' }],
                    },
                })}
            />,
        );
        await component.getByRole('button', { name: /Expand/i }).click();
        await expect(component).toContainText('Key');
        await expect(component).toContainText('Value');
    });

    test('otherProperties with copyable and propertyValue renders copy icon', async ({ mount }) => {
        const component = await mount(
            <CustomFlowNodeMountWrapper
                nodeProps={buildProps({
                    selected: true,
                    data: {
                        ...defaultData,
                        otherProperties: [{ propertyName: 'CopyMe', propertyValue: 'text', copyable: true }] as OtherProperties[],
                    },
                })}
            />,
        );
        await component.getByRole('button', { name: /Expand/i }).click();
        const copyButton = component.locator('button:has(svg.lucide-copy)').first();
        await expect(copyButton).toBeVisible();
    });

    test('otherProperties with propertyContent renders content', async ({ mount }) => {
        const component = await mount(
            <CustomFlowNodeMountWrapper
                nodeProps={buildProps({
                    selected: true,
                    data: {
                        ...defaultData,
                        otherProperties: [
                            {
                                propertyName: 'WithContent',
                                propertyContent: <span data-testid="custom-content">Custom</span>,
                            },
                        ] as OtherProperties[],
                    },
                })}
            />,
        );
        await component.getByRole('button', { name: /Expand/i }).click();
        await expect(component.getByTestId('custom-content')).toBeVisible();
    });

    test('addButtonContent renders add button when selected', async ({ mount, page }) => {
        await mount(
            <CustomFlowNodeMountWrapper
                nodeProps={buildProps({
                    selected: true,
                    data: {
                        ...defaultData,
                        addButtonContent: <span data-testid="add-content">Add content</span>,
                    },
                })}
            />,
        );
        const addBtn = page.getByTestId('flow-node-add');
        await expect(addBtn).toBeVisible({ timeout: 10000 });
        await addBtn.click();
        await expect(page.getByTestId('add-content')).toBeVisible();
    });

    test('deleteAction button calls action when clicked and not SingleChild', async ({ mount, page }) => {
        let deleteCalled = false;
        await mount(
            <CustomFlowNodeMountWrapper
                nodeProps={buildProps({
                    id: 'node-1',
                    selected: true,
                    data: {
                        ...defaultData,
                        deleteAction: {
                            action: () => {
                                deleteCalled = true;
                            },
                        },
                    },
                })}
                initialStoreState={{
                    ...testInitialState,
                    userInterface: {
                        ...testInitialState.userInterface,
                        reactFlowUI: {
                            flowChartNodes: [{ id: 'node-1', parentId: undefined }],
                            flowChartEdges: [],
                            expandedHiddenNodeId: undefined,
                        },
                    },
                }}
            />,
        );
        const deleteBtn = page.getByTestId('flow-node-delete');
        await expect(deleteBtn).toBeVisible({ timeout: 10000 });
        await deleteBtn.click();
        expect(deleteCalled).toBe(true);
    });

    test('deleteAction with SingleChild and 0 siblings shows alert and does not delete', async ({ mount, page }) => {
        await mount(
            <CustomFlowNodeMountWrapper
                nodeProps={buildProps({
                    id: 'node-1',
                    selected: true,
                    data: {
                        ...defaultData,
                        deleteAction: {
                            disableCondition: 'SingleChild',
                            disabledMessage: 'Cannot delete last',
                            action: () => {},
                        },
                    },
                })}
                initialStoreState={{
                    ...testInitialState,
                    userInterface: {
                        ...testInitialState.userInterface,
                        reactFlowUI: {
                            flowChartNodes: [{ id: 'node-1', parentId: 'parent-1' }],
                            flowChartEdges: [],
                            expandedHiddenNodeId: undefined,
                        },
                    },
                }}
            />,
        );
        const deleteBtn = page.getByTestId('flow-node-delete');
        await expect(deleteBtn).toBeVisible({ timeout: 10000 });
        await deleteBtn.click();
        // Node must still be visible (delete was blocked)
        await expect(page.getByText('Test Node')).toBeVisible();
    });

    test('hasHiddenChildren shows eye button when store has hidden children', async ({ mount, page }) => {
        await mount(
            <CustomFlowNodeMountWrapper
                nodeProps={buildProps({ id: 'node-1', selected: true, data: { ...defaultData } })}
                initialStoreState={{
                    ...testInitialState,
                    userInterface: {
                        ...testInitialState.userInterface,
                        reactFlowUI: {
                            flowChartNodes: [{ id: 'node-1' }, { id: 'child-1', parentId: 'node-1', hidden: true }],
                            flowChartEdges: [],
                            expandedHiddenNodeId: undefined,
                        },
                    },
                }}
            />,
        );
        await expect(page.getByText('Test Node')).toBeVisible();
        await expect(page.getByTestId('flow-node-toggle-hidden')).toBeVisible({ timeout: 10000 });
    });

    test('toggleHiddenNodes reveals children when expanding', async ({ mount, page }) => {
        await mount(
            <CustomFlowNodeMountWrapper
                nodeProps={buildProps({ id: 'node-1', selected: true, data: { ...defaultData } })}
                initialStoreState={{
                    ...testInitialState,
                    userInterface: {
                        ...testInitialState.userInterface,
                        reactFlowUI: {
                            flowChartNodes: [{ id: 'node-1' }, { id: 'child-1', parentId: 'node-1', hidden: true }],
                            flowChartEdges: [],
                            expandedHiddenNodeId: undefined,
                        },
                    },
                }}
            />,
        );
        await expect(page.getByText('Test Node')).toBeVisible();
        const eyeBtn = page.getByTestId('flow-node-toggle-hidden');
        const toggleWrap = page.getByTestId('flow-node-toggle-hidden-wrap');
        await expect(eyeBtn).toBeVisible({ timeout: 10000 });
        await expect(toggleWrap).toHaveAttribute('data-expanded', 'false');
        await eyeBtn.click();
        await expect(toggleWrap).toHaveAttribute('data-expanded', 'true');
    });

    test('expandAction called when expandedByDefault and expand clicked', async ({ mount }) => {
        let expandActionCalled = false;
        const component = await mount(
            <CustomFlowNodeMountWrapper
                nodeProps={buildProps({
                    selected: true,
                    data: {
                        ...defaultData,
                        expandedByDefault: false,
                        expandAction: () => {
                            expandActionCalled = true;
                        },
                        otherProperties: [{ propertyName: 'X', propertyValue: 'Y' }],
                    },
                })}
            />,
        );
        await component.getByRole('button', { name: /Expand/i }).click();
        expect(expandActionCalled).toBe(true);
    });

    test('formContent rendered when provided', async ({ mount }) => {
        const component = await mount(
            <CustomFlowNodeMountWrapper
                nodeProps={buildProps({
                    data: {
                        ...defaultData,
                        formContent: <div data-testid="form-content">Form here</div>,
                    },
                })}
            />,
        );
        await expect(component.getByTestId('form-content')).toBeVisible();
    });

    test('handleHide target hides target Handle', async ({ mount }) => {
        const component = await mount(
            <CustomFlowNodeMountWrapper nodeProps={buildProps({ data: { ...defaultData, handleHide: 'target' } })} />,
        );
        const handle = component.locator('[data-handlepos="top"]').first();
        await expect(handle).toHaveAttribute('hidden', '');
    });

    test('handleHide source hides source Handle', async ({ mount }) => {
        const component = await mount(
            <CustomFlowNodeMountWrapper nodeProps={buildProps({ data: { ...defaultData, handleHide: 'source' } })} />,
        );
        await expect(component).toContainText('Test Node');
        const sourceHandle = component.locator('[data-handlepos="bottom"]').first();
        await expect(sourceHandle).toHaveAttribute('hidden', '');
    });

    test('icon with extra spaces normalized', async ({ mount }) => {
        const component = await mount(
            <CustomFlowNodeMountWrapper nodeProps={buildProps({ data: { ...defaultData, icon: 'fa   fa-user' } })} />,
        );
        await expect(component).toContainText('Test Node');
    });

    test('otherProperties with empty propertyName renders', async ({ mount }) => {
        const component = await mount(
            <CustomFlowNodeMountWrapper
                nodeProps={buildProps({
                    selected: true,
                    data: {
                        ...defaultData,
                        otherProperties: [{ propertyValue: 'Only value' }],
                    },
                })}
            />,
        );
        await component.getByRole('button', { name: /Expand/i }).click();
        await expect(component.getByText('Only value')).toBeVisible();
    });

    test('toggleHiddenNodes collapse hides children when clicking eye again', async ({ mount, page }) => {
        await mount(
            <CustomFlowNodeMountWrapper
                nodeProps={buildProps({ id: 'node-1', selected: true, data: { ...defaultData } })}
                initialStoreState={{
                    ...testInitialState,
                    userInterface: {
                        ...testInitialState.userInterface,
                        reactFlowUI: {
                            // child already visible → node is in the expanded state
                            flowChartNodes: [{ id: 'node-1' }, { id: 'child-1', parentId: 'node-1', hidden: false }],
                            flowChartEdges: [],
                            expandedHiddenNodeId: undefined,
                        },
                    },
                }}
            />,
        );
        const toggleWrap = page.getByTestId('flow-node-toggle-hidden-wrap');
        await expect(toggleWrap).toHaveAttribute('data-expanded', 'true');
        await page.getByTestId('flow-node-toggle-hidden').click();
        await expect(toggleWrap).toHaveAttribute('data-expanded', 'false');
    });

    test('add button toggles to Minus and hides content when clicked again', async ({ mount, page }) => {
        await mount(
            <CustomFlowNodeMountWrapper
                nodeProps={buildProps({
                    selected: true,
                    data: {
                        ...defaultData,
                        addButtonContent: <span data-testid="add-content">Add content</span>,
                    },
                })}
            />,
        );
        const addBtn = page.getByTestId('flow-node-add');
        await addBtn.waitFor({ state: 'visible' });
        await addBtn.click();
        await expect(page.getByTestId('add-content')).toBeVisible();
        await addBtn.click();
        await expect(page.getByTestId('add-content')).toBeHidden();
    });

    test('renders fa-certificate icon', async ({ mount }) => {
        const component = await mount(
            <CustomFlowNodeMountWrapper nodeProps={buildProps({ data: { ...defaultData, icon: 'fa-certificate' } })} />,
        );
        await expect(component.locator('.certificate-icon').first()).toBeVisible();
    });

    test('renders fa fa-certificate icon format', async ({ mount }) => {
        const component = await mount(
            <CustomFlowNodeMountWrapper nodeProps={buildProps({ data: { ...defaultData, icon: 'fa fa-certificate' } })} />,
        );
        await expect(component.locator('.certificate-icon').first()).toBeVisible();
    });

    test('expand button uses certificate status classes', async ({ mount }) => {
        const component = await mount(
            <CustomFlowNodeMountWrapper
                nodeProps={buildProps({
                    selected: true,
                    data: {
                        ...defaultData,
                        otherProperties: [{ propertyName: 'P1', propertyValue: 'V1' }],
                        certificateNodeData: {
                            certificateNodeValidationStatus: CertificateValidationStatus.Valid,
                        },
                    },
                })}
            />,
        );
        const expandBtn = component.getByRole('button', { name: /Expand/i });
        await expect(expandBtn).toBeVisible();
        await expect(expandBtn).toHaveClass(/!bg-\[#1ab3949f\]/);
    });

    test('expand button uses group based classes', async ({ mount }) => {
        const component = await mount(
            <CustomFlowNodeMountWrapper
                nodeProps={buildProps({
                    selected: true,
                    data: {
                        ...defaultData,
                        group: 'rules',
                        otherProperties: [{ propertyName: 'P1', propertyValue: 'V1' }],
                    },
                })}
            />,
        );
        await expect(component.getByRole('button', { name: /Expand/i })).toHaveClass(/!bg-\[#7fa2c1a1\]/);
    });

    test('expand button uses actions group based classes', async ({ mount }) => {
        const component = await mount(
            <CustomFlowNodeMountWrapper
                nodeProps={buildProps({
                    selected: true,
                    data: {
                        ...defaultData,
                        group: 'actions',
                        otherProperties: [{ propertyName: 'P1', propertyValue: 'V1' }],
                    },
                })}
            />,
        );
        await expect(component.getByRole('button', { name: /Expand/i })).toHaveClass(/!bg-\[#1ab3949f\]/);
    });

    const expandStatusCases: Array<{ status: CertificateValidationStatus; classFragment: string }> = [
        { status: CertificateValidationStatus.Expired, classFragment: '!bg-[#ef4444a4]' },
        { status: CertificateValidationStatus.Revoked, classFragment: '!bg-[#632828b7]' },
        { status: CertificateValidationStatus.Expiring, classFragment: '!bg-[#eab308a6]' },
        { status: CertificateValidationStatus.Invalid, classFragment: '!bg-[#131212a3]' },
        { status: CertificateValidationStatus.NotChecked, classFragment: '!bg-[#7fa2c1a1]' },
        { status: CertificateValidationStatus.Failed, classFragment: '!bg-[#9c0012a2]' },
        { status: CertificateValidationStatus.Inactive, classFragment: '!bg-[#6c757da0]' },
    ];

    for (const c of expandStatusCases) {
        test(`expand button renders certificate status variant ${c.status}`, async ({ mount }) => {
            const component = await mount(
                <CustomFlowNodeMountWrapper
                    nodeProps={buildProps({
                        selected: true,
                        data: {
                            ...defaultData,
                            otherProperties: [{ propertyName: 'P1', propertyValue: 'V1' }],
                            certificateNodeData: {
                                certificateNodeValidationStatus: c.status,
                            },
                        },
                    })}
                />,
            );
            const expandClassName = await component.getByRole('button', { name: /Expand/i }).getAttribute('class');
            expect(expandClassName).toContain(c.classFragment);
        });
    }

    test('copyable property copy on Enter key', async ({ mount }) => {
        const component = await mount(
            <CustomFlowNodeMountWrapper
                nodeProps={buildProps({
                    selected: true,
                    data: {
                        ...defaultData,
                        otherProperties: [
                            {
                                propertyName: 'CopyMe',
                                propertyValue: 'value-to-copy',
                                copyable: true,
                            },
                        ] as OtherProperties[],
                    },
                })}
            />,
        );
        await component.getByRole('button', { name: /Expand/i }).click();
        const row = component.locator('.grid').filter({ hasText: 'CopyMe' }).filter({ hasText: 'value-to-copy' });
        const copyButton = row.getByRole('button');
        await copyButton.focus();
        await copyButton.press('Enter');
        await expect(component.getByText('CopyMe')).toBeVisible();
    });

    test('copyable property copy on click', async ({ mount }) => {
        const component = await mount(
            <CustomFlowNodeMountWrapper
                nodeProps={buildProps({
                    selected: true,
                    data: {
                        ...defaultData,
                        otherProperties: [
                            {
                                propertyName: 'CopyByClick',
                                propertyValue: 'value-click',
                                copyable: true,
                            },
                        ] as OtherProperties[],
                    },
                })}
            />,
        );
        await component.getByRole('button', { name: /Expand/i }).click();
        const row = component.locator('.grid').filter({ hasText: 'CopyByClick' }).filter({ hasText: 'value-click' });
        await row.getByRole('button').click();
        await expect(component.getByText('CopyByClick')).toBeVisible();
    });

    test('single child delete condition allows delete when sibling exists', async ({ mount, page }) => {
        let deleteCalled = false;
        await mount(
            <CustomFlowNodeMountWrapper
                nodeProps={buildProps({
                    id: 'node-1',
                    selected: true,
                    data: {
                        ...defaultData,
                        deleteAction: {
                            disableCondition: 'SingleChild',
                            action: () => {
                                deleteCalled = true;
                            },
                        },
                    },
                })}
                initialStoreState={{
                    ...testInitialState,
                    userInterface: {
                        ...testInitialState.userInterface,
                        reactFlowUI: {
                            flowChartNodes: [
                                { id: 'node-1', parentId: 'parent-1' },
                                { id: 'node-2', parentId: 'parent-1' },
                            ],
                            flowChartEdges: [],
                            expandedHiddenNodeId: undefined,
                        },
                    },
                }}
            />,
        );
        await page.getByTestId('flow-node-delete').click();
        expect(deleteCalled).toBe(true);
    });

    test('toggleHiddenNodes expands this node children independently of other visible nodes', async ({ mount, page }) => {
        await mount(
            <CustomFlowNodeMountWrapper
                nodeProps={buildProps({ id: 'node-1', selected: true })}
                initialStoreState={{
                    ...testInitialState,
                    userInterface: {
                        ...testInitialState.userInterface,
                        reactFlowUI: {
                            flowChartNodes: [
                                { id: 'node-1' },
                                { id: 'child-1', parentId: 'node-1', hidden: true },
                                { id: 'other-visible', hidden: false },
                            ],
                            flowChartEdges: [],
                            expandedHiddenNodeId: undefined,
                        },
                    },
                }}
            />,
        );
        await page.getByTestId('flow-node-toggle-hidden').click();
        await expect(page.getByTestId('flow-node-toggle-hidden-wrap')).toHaveAttribute('data-expanded', 'true');
    });

    test('otherProperties scroll container handles wheel event', async ({ mount }) => {
        const component = await mount(
            <CustomFlowNodeMountWrapper
                nodeProps={buildProps({
                    selected: true,
                    data: {
                        ...defaultData,
                        otherProperties: [{ propertyName: 'Scrollable', propertyValue: 'Row' }],
                    },
                })}
            />,
        );
        await component.getByRole('button', { name: /Expand/i }).click();
        const scrollContainer = component.locator(String.raw`.max-h-\[150px\]`).first();
        await scrollContainer.dispatchEvent('wheel', { deltaY: 25 });
        await expect(component.getByText('Scrollable')).toBeVisible();
    });

    test('deleteAction with children dispatches deleteNode for each child', async ({ mount, page }) => {
        let deleteActionCalled = false;
        await mount(
            <CustomFlowNodeMountWrapper
                nodeProps={buildProps({
                    id: 'node-1',
                    selected: true,
                    data: {
                        ...defaultData,
                        deleteAction: {
                            action: () => {
                                deleteActionCalled = true;
                            },
                        },
                    },
                })}
                initialStoreState={{
                    ...testInitialState,
                    userInterface: {
                        ...testInitialState.userInterface,
                        reactFlowUI: {
                            flowChartNodes: [
                                { id: 'node-1' },
                                { id: 'child-1', parentId: 'node-1' },
                                { id: 'child-2', parentId: 'node-1' },
                            ],
                            flowChartEdges: [],
                            expandedHiddenNodeId: undefined,
                        },
                    },
                }}
            />,
        );
        await page.getByTestId('flow-node-delete').click();
        expect(deleteActionCalled).toBe(true);
    });
});
