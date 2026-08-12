import { test, expect } from '../../../playwright/ct-test';
import Pagination from './index';

test.describe('Pagination', () => {
    test('should render pagination with page numbers', async ({ mount }) => {
        const component = await mount(
            <div>
                <Pagination page={1} totalPages={5} onPageChange={() => {}} />
            </div>,
        );

        const nav = component.getByRole('navigation', { name: 'Pagination' });
        await expect(nav).toBeVisible();
    });

    test('should display current page', async ({ mount }) => {
        const component = await mount(
            <div>
                <Pagination page={3} totalPages={5} onPageChange={() => {}} />
            </div>,
        );

        const currentPageButton = component.getByRole('button', { name: '3' });
        await expect(currentPageButton).toBeVisible();
        await expect(currentPageButton).toHaveAttribute('aria-current', 'page');
    });

    test('should call onPageChange when page button is clicked', async ({ mount }) => {
        let newPage = 0;
        const handlePageChange = (page: number) => {
            newPage = page;
        };

        const component = await mount(
            <div>
                <Pagination page={1} totalPages={5} onPageChange={handlePageChange} />
            </div>,
        );

        const page2Button = component.getByRole('button', { name: '2' });
        await page2Button.click();
        expect(newPage).toBe(2);
    });

    test('should disable previous button on first page', async ({ mount }) => {
        const component = await mount(
            <div>
                <Pagination page={1} totalPages={5} onPageChange={() => {}} />
            </div>,
        );

        const previousButton = component.getByRole('button', { name: 'Previous' });
        await expect(previousButton).toBeDisabled();
    });

    test('should enable previous button when not on first page', async ({ mount }) => {
        const component = await mount(
            <div>
                <Pagination page={3} totalPages={5} onPageChange={() => {}} />
            </div>,
        );

        const previousButton = component.getByRole('button', { name: 'Previous' });
        await expect(previousButton).toBeEnabled();
    });

    test('should call onPageChange when previous button is clicked', async ({ mount }) => {
        let newPage = 0;
        const handlePageChange = (page: number) => {
            newPage = page;
        };

        const component = await mount(
            <div>
                <Pagination page={3} totalPages={5} onPageChange={handlePageChange} />
            </div>,
        );

        const previousButton = component.getByRole('button', { name: 'Previous' });
        await previousButton.click();
        expect(newPage).toBe(2);
    });

    test('should disable next button on last page', async ({ mount }) => {
        const component = await mount(
            <div>
                <Pagination page={5} totalPages={5} onPageChange={() => {}} />
            </div>,
        );

        const nextButton = component.getByRole('button', { name: 'Next' });
        await expect(nextButton).toBeDisabled();
    });

    test('should enable next button when not on last page', async ({ mount }) => {
        const component = await mount(
            <div>
                <Pagination page={3} totalPages={5} onPageChange={() => {}} />
            </div>,
        );

        const nextButton = component.getByRole('button', { name: 'Next' });
        await expect(nextButton).toBeEnabled();
    });

    test('should call onPageChange when next button is clicked', async ({ mount }) => {
        let newPage = 0;
        const handlePageChange = (page: number) => {
            newPage = page;
        };

        const component = await mount(
            <div>
                <Pagination page={3} totalPages={5} onPageChange={handlePageChange} />
            </div>,
        );

        const nextButton = component.getByRole('button', { name: 'Next' });
        await nextButton.click();
        expect(newPage).toBe(4);
    });

    test('should show ellipsis when there are many pages', async ({ mount }) => {
        const component = await mount(
            <div>
                <Pagination page={5} totalPages={10} onPageChange={() => {}} />
            </div>,
        );

        const ellipsisButton = component.getByRole('button', { name: /•••/ }).first();
        await expect(ellipsisButton).toBeVisible();
        await expect(ellipsisButton).toBeDisabled();
    });

    test('should render all pages when totalPages is small', async ({ mount }) => {
        const component = await mount(
            <div>
                <Pagination page={1} totalPages={3} onPageChange={() => {}} />
            </div>,
        );

        await expect(component.getByRole('button', { name: '1' })).toBeVisible();
        await expect(component.getByRole('button', { name: '2' })).toBeVisible();
        await expect(component.getByRole('button', { name: '3' })).toBeVisible();
    });

    test('should highlight active page with correct styling', async ({ mount }) => {
        const component = await mount(
            <div>
                <Pagination page={2} totalPages={5} onPageChange={() => {}} />
            </div>,
        );

        const activePageButton = component.getByRole('button', { name: '2' });
        await expect(activePageButton).toHaveClass(/bg-surface-active/);
    });

    test('should disable all navigation controls when disabled is true', async ({ mount }) => {
        let newPage = 0;
        const component = await mount(
            <div>
                <Pagination page={3} totalPages={5} onPageChange={(page) => (newPage = page)} disabled={true} />
            </div>,
        );

        await expect(component.getByRole('button', { name: 'Previous' })).toBeDisabled();
        await expect(component.getByRole('button', { name: 'Next' })).toBeDisabled();
        await expect(component.getByRole('button', { name: '3' })).toBeDisabled();
        expect(newPage).toBe(0);
    });
});
