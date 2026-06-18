import { test, expect } from '../../../../../playwright/ct-test';
import SigningRecordsDashboardWithStore from './SigningRecordsDashboardWithStore';

test.describe('SigningRecordsDashboard', () => {
    test('renders count badges, the time-series and breakdowns', async ({ mount }) => {
        const component = await mount(<SigningRecordsDashboardWithStore />);
        await expect(component.getByRole('heading', { name: 'Signing Records' })).toBeVisible();
        await expect(component.getByRole('heading', { name: 'Active Signing Profiles' })).toBeVisible();
        await expect(component.getByRole('heading', { name: 'Signings over Time' })).toBeVisible();
        await expect(component.getByRole('heading', { name: 'Top Requesters' })).toBeVisible();
        // single-key breakdowns render muted with their captions
        await expect(component.getByText('unlocks when CSC API ships')).toBeVisible();
    });
});
