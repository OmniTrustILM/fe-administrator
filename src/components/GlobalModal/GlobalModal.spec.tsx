import { test, expect } from '../../../playwright/ct-test';
import Dialog from 'components/Dialog';
import { getGlobalModalDialogProps } from './index';
import GlobalModalMountWrapper from './GlobalModalMountWrapper';
import { createMockStore, withProviders } from 'utils/test-helpers';
import { testInitialState } from 'ducks/test-reducers';
import { actions } from 'ducks/user-interface';
import type { GlobalModalModel } from 'types/user-interface';

function createGlobalModalPreload(overrides: Record<string, unknown> = {}) {
    return {
        userInterface: {
            ...testInitialState.userInterface,
            globalModal: {
                ...testInitialState.userInterface.globalModal,
                ...overrides,
            },
        },
    };
}

function baseGlobalModal(overrides: Partial<GlobalModalModel> = {}): GlobalModalModel {
    return {
        isOpen: false,
        size: 'sm',
        title: undefined,
        content: undefined,
        showCancelButton: false,
        showOkButton: false,
        showSubmitButton: false,
        showCloseButton: false,
        okButtonCallback: undefined,
        cancelButtonCallback: undefined,
        icon: undefined,
        ...overrides,
    };
}

test.describe('GlobalModal', () => {
    test('mounts with closed modal via wrapper', async ({ mount }) => {
        const store = createMockStore(createGlobalModalPreload());
        await mount(withProviders(<GlobalModalMountWrapper />, { store }));
    });

    test('Dialog with getGlobalModalDialogProps OK button runs in browser', async ({ mount, page }) => {
        const dispatched: unknown[] = [];
        const dispatch = (a: unknown) => dispatched.push(a);
        const props = getGlobalModalDialogProps(baseGlobalModal({ isOpen: true, showOkButton: true }), dispatch as any);
        await mount(<Dialog {...props} />);
        await expect(page.locator('[data-testid="global-modal"]')).toBeVisible({ timeout: 5000 });
        await page.getByRole('button', { name: 'OK' }).click();
        expect(dispatched).toContainEqual(actions.resetState());
    });

    test('Dialog with getGlobalModalDialogProps Cancel button runs in browser', async ({ mount, page }) => {
        const dispatched: unknown[] = [];
        const dispatch = (a: unknown) => dispatched.push(a);
        const props = getGlobalModalDialogProps(baseGlobalModal({ isOpen: true, showCancelButton: true }), dispatch as any);
        await mount(<Dialog {...props} />);
        await page.getByRole('button', { name: 'Cancel' }).click();
        expect(dispatched).toContainEqual(actions.resetState());
    });

    test('Dialog with getGlobalModalDialogProps Submit button runs in browser', async ({ mount, page }) => {
        const dispatched: unknown[] = [];
        const dispatch = (a: unknown) => dispatched.push(a);
        const props = getGlobalModalDialogProps(baseGlobalModal({ isOpen: true, showSubmitButton: true }), dispatch as any);
        await mount(<Dialog {...props} />);
        await page.getByRole('button', { name: 'Submit' }).click();
        expect(dispatched).toContainEqual(actions.resetState());
    });

    test('Dialog with getGlobalModalDialogProps Close button runs in browser', async ({ mount, page }) => {
        const dispatched: unknown[] = [];
        const dispatch = (a: unknown) => dispatched.push(a);
        const props = getGlobalModalDialogProps(baseGlobalModal({ isOpen: true, showCloseButton: true }), dispatch as any);
        await mount(<Dialog {...props} />);
        await page.locator('.modal-footer').getByRole('button', { name: 'Close' }).click();
        expect(dispatched).toContainEqual(actions.resetState());
    });

    test('Dialog with getGlobalModalDialogProps toggle runs in browser', async ({ mount, page }) => {
        const dispatched: unknown[] = [];
        const dispatch = (a: unknown) => dispatched.push(a);
        const props = getGlobalModalDialogProps(baseGlobalModal({ isOpen: true }), dispatch as any);
        await mount(<Dialog {...props} />);
        await page.locator('[data-testid="global-modal"]').locator('button').first().click();
        expect(dispatched).toContainEqual(actions.resetState());
    });

    test('Dialog with isOpen renders modal in CT', async ({ mount, page }) => {
        await mount(<Dialog isOpen={true} caption="Test" body="Body" dataTestId="global-modal" />);
        await expect(page.locator('[data-testid="global-modal"]')).toBeVisible({ timeout: 5000 });
    });

    test('getGlobalModalDialogProps returns correct Dialog props', () => {
        const dispatch = () => {};
        const props = getGlobalModalDialogProps(baseGlobalModal({ isOpen: true, title: 'T', content: 'C', size: 'lg' }), dispatch as any);
        expect(props.dataTestId).toBe('global-modal');
        expect(props.isOpen).toBe(true);
        expect(props.caption).toBe('T');
        expect(props.body).toBe('C');
        expect(props.size).toBe('lg');
        expect(props.buttons).toEqual([]);
    });

    test('getGlobalModalDialogProps passes size undefined when size is falsy', () => {
        const dispatch = () => {};
        const props = getGlobalModalDialogProps(baseGlobalModal({ size: undefined }), dispatch as any);
        expect(props.size).toBeUndefined();
    });

    test('getGlobalModalDialogProps adds OK button and okButtonCallback is called', () => {
        const dispatch = () => {};
        let okCalled = false;
        const okCb = () => (okCalled = true);
        const props = getGlobalModalDialogProps(baseGlobalModal({ showOkButton: true, okButtonCallback: okCb }), dispatch as any);
        expect(props.buttons).toHaveLength(1);
        expect(props.buttons![0].body).toBe('OK');
        props.buttons![0].onClick();
        expect(okCalled).toBe(true);
    });

    test('getGlobalModalDialogProps OK button dispatches when no callback', () => {
        const dispatched: unknown[] = [];
        const dispatch = (a: unknown) => dispatched.push(a);
        const props = getGlobalModalDialogProps(baseGlobalModal({ showOkButton: true }), dispatch as any);
        props.buttons![0].onClick();
        expect(dispatched).toContainEqual(actions.resetState());
    });

    test('getGlobalModalDialogProps adds Cancel button and cancelButtonCallback is called', () => {
        const dispatch = () => {};
        let cancelCalled = false;
        const cancelCb = () => (cancelCalled = true);
        const props = getGlobalModalDialogProps(
            baseGlobalModal({ showCancelButton: true, cancelButtonCallback: cancelCb }),
            dispatch as any,
        );
        expect(props.buttons?.some((b) => b.body === 'Cancel')).toBe(true);
        const cancelBtn = props.buttons!.find((b) => b.body === 'Cancel')!;
        cancelBtn.onClick();
        expect(cancelCalled).toBe(true);
    });

    test('getGlobalModalDialogProps Cancel button dispatches when no callback', () => {
        const dispatched: unknown[] = [];
        const dispatch = (a: unknown) => dispatched.push(a);
        const props = getGlobalModalDialogProps(baseGlobalModal({ showCancelButton: true }), dispatch as any);
        const cancelBtn = props.buttons!.find((b) => b.body === 'Cancel')!;
        cancelBtn.onClick();
        expect(dispatched).toContainEqual(actions.resetState());
    });

    test('getGlobalModalDialogProps adds Submit button and uses okButtonCallback', () => {
        const dispatch = () => {};
        let okCalled = false;
        const okCb = () => (okCalled = true);
        const props = getGlobalModalDialogProps(baseGlobalModal({ showSubmitButton: true, okButtonCallback: okCb }), dispatch as any);
        const submitBtn = props.buttons!.find((b) => b.body === 'Submit')!;
        submitBtn.onClick();
        expect(okCalled).toBe(true);
    });

    test('getGlobalModalDialogProps Submit button dispatches when no callback', () => {
        const dispatched: unknown[] = [];
        const dispatch = (a: unknown) => dispatched.push(a);
        const props = getGlobalModalDialogProps(baseGlobalModal({ showSubmitButton: true }), dispatch as any);
        const submitBtn = props.buttons!.find((b) => b.body === 'Submit')!;
        submitBtn.onClick();
        expect(dispatched).toContainEqual(actions.resetState());
    });

    test('getGlobalModalDialogProps Close button calls cancelButtonCallback', () => {
        const dispatch = () => {};
        let closeCalled = false;
        const cancelCb = () => (closeCalled = true);
        const props = getGlobalModalDialogProps(
            baseGlobalModal({ showCloseButton: true, cancelButtonCallback: cancelCb }),
            dispatch as any,
        );
        const closeBtn = props.buttons!.find((b) => b.body === 'Close')!;
        closeBtn.onClick();
        expect(closeCalled).toBe(true);
    });

    test('getGlobalModalDialogProps Close button dispatches when no cancelButtonCallback', () => {
        const dispatched: unknown[] = [];
        const dispatch = (a: unknown) => dispatched.push(a);
        const props = getGlobalModalDialogProps(baseGlobalModal({ showCloseButton: true }), dispatch as any);
        const closeBtn = props.buttons!.find((b) => b.body === 'Close')!;
        closeBtn.onClick();
        expect(dispatched).toContainEqual(actions.resetState());
    });

    test('getGlobalModalDialogProps toggle calls cancelButtonCallback', () => {
        const dispatch = () => {};
        let toggleCalled = false;
        const cancelCb = () => (toggleCalled = true);
        const props = getGlobalModalDialogProps(baseGlobalModal({ cancelButtonCallback: cancelCb }), dispatch as any);
        props.toggle!();
        expect(toggleCalled).toBe(true);
    });

    test('getGlobalModalDialogProps toggle dispatches when no cancelButtonCallback', () => {
        const dispatched: unknown[] = [];
        const dispatch = (a: unknown) => dispatched.push(a);
        const props = getGlobalModalDialogProps(baseGlobalModal({}), dispatch as any);
        props.toggle!();
        expect(dispatched).toContainEqual(actions.resetState());
    });
});
