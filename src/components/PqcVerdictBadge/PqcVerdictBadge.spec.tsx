import { PqcVerdict } from 'types/openapi';
import { inContainer } from 'utils/test-helpers';
import { expect, test } from '../../../playwright/ct-test';
import PqcVerdictBadge from './index';

test.describe('PqcVerdictBadge', () => {
    test('renders the platform label', async ({ mount }) => {
        const component = await mount(inContainer(<PqcVerdictBadge verdict={PqcVerdict.NotReady} label="Not PQC ready" />));

        await expect(component.getByText('Not PQC ready')).toBeVisible();
    });

    test.describe('surface fill per verdict', () => {
        for (const [verdict, label, fill, dot] of [
            [PqcVerdict.Ready, 'PQC ready', /bg-success-surface/, /bg-success-solid/],
            [PqcVerdict.NotReady, 'Not PQC ready', /bg-danger-surface/, /bg-danger-solid/],
            [PqcVerdict.Unknown, 'Unknown', /bg-warning-surface/, /bg-warning-solid/],
            [PqcVerdict.NotApplicable, 'Not applicable', /bg-surface-sunken/, /bg-outline/],
        ] as const) {
            test(`${verdict} carries ${fill.source} with a ${dot.source} dot`, async ({ mount }) => {
                const component = await mount(inContainer(<PqcVerdictBadge verdict={verdict} label={label} />));

                await expect(component.getByTestId('pqc-verdict-badge')).toHaveClass(fill);
                await expect(component.getByTestId('pqc-verdict-badge')).not.toHaveClass(/bg-(success|danger|warning|info)-solid/);
                await expect(component.getByTestId('pqc-verdict-dot')).toHaveClass(dot);
            });
        }
    });

    test('the status dot is decorative, so it is hidden from assistive technology', async ({ mount }) => {
        const component = await mount(inContainer(<PqcVerdictBadge verdict={PqcVerdict.NotReady} label="Not PQC ready" />));

        await expect(component.getByTestId('pqc-verdict-dot')).toHaveAttribute('aria-hidden', 'true');
    });

    test('a tooltip carries the verdict meaning when the caller supplies one', async ({ mount }) => {
        const component = await mount(
            inContainer(
                <PqcVerdictBadge
                    verdict={PqcVerdict.NotReady}
                    label="Not PQC ready"
                    title="The asset relies on cryptography a quantum computer breaks"
                />,
            ),
        );

        await expect(component.getByTestId('pqc-verdict-badge')).toHaveAttribute(
            'title',
            'The asset relies on cryptography a quantum computer breaks',
        );
    });
});
