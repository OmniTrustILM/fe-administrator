import type { Page } from '@playwright/test';

type HeldReads = {
    complete: (index: number) => Promise<void>;
    fail: (index: number) => void;
};

type WithHeldReads = { heldFileReads: HeldReads };

/**
 * Holds every `FileReader.readAsDataURL` the page starts until the test settles it by its index, so a test decides when,
 * and in which order, file reads complete or fail.
 */
export async function holdFileReads(page: Page) {
    await page.evaluate(() => {
        const held: { reader: FileReader; blob: Blob }[] = [];
        const read = FileReader.prototype.readAsDataURL;
        FileReader.prototype.readAsDataURL = function (this: FileReader, blob: Blob) {
            held.push({ reader: this, blob });
        };
        const heldFileReads: HeldReads = {
            // Resolves once the reader's own handlers have run and the page has had a task to render their outcome.
            complete: (index) =>
                new Promise((resolve) => {
                    const { reader, blob } = held[index];
                    reader.addEventListener('loadend', () => setTimeout(resolve));
                    read.call(reader, blob);
                }),
            fail: (index) => held[index].reader.dispatchEvent(new ProgressEvent('error')),
        };
        Object.assign(globalThis, { heldFileReads });
    });
}

export const completeFileRead = (page: Page, index: number) =>
    page.evaluate((each) => (globalThis as unknown as WithHeldReads).heldFileReads.complete(each), index);

export const failFileRead = (page: Page, index: number) =>
    page.evaluate((each) => (globalThis as unknown as WithHeldReads).heldFileReads.fail(each), index);
