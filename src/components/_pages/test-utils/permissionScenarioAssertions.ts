import type { Locator } from '@playwright/test';
import { expect } from '../../../../playwright/ct-test';

const PERMISSION_DENIAL = /You need the .+ permission on .+\.|Your permissions do not allow .+ on this object\./;

/**
 * Asserts a control is offered, or withheld for a missing permission. A withheld control must not be merely loading,
 * and its hover reason must name a permission, since `Button` shows a state-disabled control's reason the same way.
 */
export async function expectOffered(control: Locator, offered: boolean) {
    if (offered) {
        await expect(control).toBeEnabled();
        return;
    }
    await expect(control).toBeDisabled();
    await expect(control).not.toHaveAttribute('aria-busy');

    const trigger = control.locator('xpath=..');
    await trigger.hover();
    await expect(trigger).toHaveAttribute('aria-describedby', /.+/);
    const tooltipId = await trigger.getAttribute('aria-describedby');
    await expect(control.page().locator(`[id="${tooltipId}"]`)).toHaveText(PERMISSION_DENIAL);
}
