import { test, expect } from 'playwright/ct-test';
import Tooltip from './index';

// Mimics the stacking context of the app's Dialog (z-[80] overlay).
// A Tooltip rendered inside a dialog must float ABOVE that overlay, otherwise
// the content is present in the DOM (toBeVisible passes) but covered and unreadable.
test('tooltip content renders above a dialog-level overlay (not occluded)', async ({ mount, page }) => {
    await mount(
        <div>
            {/* dialog-level overlay covering the whole viewport */}
            <div data-testid="overlay" className="fixed inset-0 z-[80] bg-black/50" />
            {/* trigger sits above the overlay, like content inside a dialog */}
            <div className="fixed left-40 top-40 z-[90]">
                <Tooltip content="Tooltip content text">
                    <span data-testid="trigger">trigger</span>
                </Tooltip>
            </div>
        </div>,
    );

    await page.getByTestId('trigger').hover();
    const content = page.getByText('Tooltip content text');
    await expect(content).toBeVisible();

    // toBeVisible() does not detect occlusion — assert the tooltip is the topmost
    // element at its own center point.
    const box = (await content.boundingBox())!;
    const topMostTestId = await page.evaluate(
        ({ x, y }) => {
            const el = document.elementFromPoint(x, y);
            return el?.closest('[data-testid]')?.getAttribute('data-testid') ?? el?.textContent ?? null;
        },
        { x: box.x + box.width / 2, y: box.y + box.height / 2 },
    );

    expect(topMostTestId).not.toBe('overlay');
});
