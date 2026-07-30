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

    test('the 24h tile drills down to signing records filtered by signing time', async ({ mount }) => {
        const component = await mount(<SigningRecordsDashboardWithStore />);

        await component.getByRole('link', { name: 'Signings – last 24h' }).click();

        await expect(component.getByTestId('route')).toHaveText('/signingrecords');
        const applied = JSON.parse((await component.getByTestId('current-filters').textContent()) ?? '[]');
        expect(applied.map((filter: { condition: string }) => filter.condition)).toEqual(['GREATER_OR_EQUAL', 'LESSER_OR_EQUAL']);
        expect(applied.every((filter: { fieldIdentifier: string }) => filter.fieldIdentifier === 'SIGNING_TIME')).toBe(true);
        expect(Date.parse(applied[0].value)).toBeLessThan(Date.parse(applied[1].value));
        expect(Date.parse(applied[1].value)).toBeLessThanOrEqual(Date.now());
    });

    test('the 7d tile drills down with a wider signing time window than the 24h tile', async ({ mount }) => {
        const component = await mount(<SigningRecordsDashboardWithStore />);

        await component.getByRole('link', { name: 'Signings – last 7d' }).click();
        const sevenDays = JSON.parse((await component.getByTestId('current-filters').textContent()) ?? '[]');

        expect(Date.now() - Date.parse(sevenDays[0].value)).toBeGreaterThan(6 * 24 * 60 * 60 * 1000);
    });

    test('the total tile clears any previously applied filter', async ({ mount }) => {
        const component = await mount(<SigningRecordsDashboardWithStore />);

        await component.getByRole('link', { name: 'Signings – last 24h' }).click();
        await expect(component.getByTestId('current-filters')).not.toHaveText('[]');

        await component.getByRole('link', { name: 'Signing Records', exact: true }).click();

        await expect(component.getByTestId('current-filters')).toHaveText('[]');
        await expect(component.getByTestId('route')).toHaveText('/signingrecords');
    });

    test('the active profiles tile opens the signing profiles list', async ({ mount }) => {
        const component = await mount(<SigningRecordsDashboardWithStore />);

        await component.getByRole('link', { name: 'Active Signing Profiles' }).click();

        await expect(component.getByTestId('route')).toHaveText('/signingprofiles');
    });
});
