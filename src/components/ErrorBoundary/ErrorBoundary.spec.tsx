import { test, expect } from '../../../playwright/ct-test';
import { MemoryRouter } from 'react-router';
import ErrorBoundary from './index';
import ThrowError from './ErrorBoundaryThrowError';

test.describe('ErrorBoundary', () => {
    test('should render children when there is no error', async ({ mount, page }) => {
        await mount(
            <MemoryRouter initialEntries={['/']}>
                <ErrorBoundary>
                    <div data-testid="child">Content</div>
                </ErrorBoundary>
            </MemoryRouter>,
        );
        await expect(page.getByTestId('child')).toBeVisible();
        await expect(page.getByText('Content')).toBeVisible();
    });

    test('should show error UI when child throws', async ({ mount, page }) => {
        await mount(
            <MemoryRouter initialEntries={['/']}>
                <ErrorBoundary>
                    <ThrowError />
                </ErrorBoundary>
            </MemoryRouter>,
        );
        await expect(page.getByText('Something went wrong')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Try Again' })).toBeVisible();
    });

    test('should use custom fallback when provided', async ({ mount, page }) => {
        await mount(
            <MemoryRouter initialEntries={['/']}>
                <ErrorBoundary fallback={<div data-testid="custom-fallback">Custom error</div>}>
                    <ThrowError />
                </ErrorBoundary>
            </MemoryRouter>,
        );
        await expect(page.getByTestId('custom-fallback')).toBeVisible();
        await expect(page.getByText('Custom error')).toBeVisible();
    });
});
