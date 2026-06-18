import { test, expect } from '../../../../../playwright/ct-test';
import MutedBreakdown from './MutedBreakdown';

test.describe('MutedBreakdown', () => {
    test('renders title, single label/value and caption', async ({ mount }) => {
        const component = await mount(
            <MutedBreakdown title="Signings by Protocol" label="TSP" value={42} caption="unlocks when CSC API ships" />,
        );
        await expect(component).toContainText('Signings by Protocol');
        await expect(component).toContainText('TSP');
        await expect(component).toContainText('42');
        await expect(component).toContainText('unlocks when CSC API ships');
    });
});
