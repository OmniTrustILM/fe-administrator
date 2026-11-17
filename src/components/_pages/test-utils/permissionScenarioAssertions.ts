import type { Locator } from '@playwright/test';
import { expect } from '../../../../playwright/ct-test';

/**
 * Asserts a control is offered, or withheld for a missing permission. A withheld control must not be merely loading,
 * and `Button` wraps a denied control so its reason stays hoverable, which tells a denial from a state-disabled one.
 */
export async function expectOffered(control: Locator, offered: boolean) {
    if (offered) {
        await expect(control).toBeEnabled();
        return;
    }
    await expect(control).toBeDisabled();
    await expect(control).not.toHaveAttribute('aria-busy');
    await expect(control.locator('xpath=..')).toHaveClass(/inline-flex/);
}
