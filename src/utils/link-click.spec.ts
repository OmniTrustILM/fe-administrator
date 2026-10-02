import { describe, expect, test, vi } from 'vitest';
import { isSameTabClick, onSameTabClick } from './link-click';

const plain = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false };

describe('isSameTabClick', () => {
    test('accepts a plain primary click', () => {
        expect(isSameTabClick(plain)).toBe(true);
    });

    test.each(['metaKey', 'ctrlKey', 'shiftKey', 'altKey'] as const)('rejects a click with %s held', (key) => {
        expect(isSameTabClick({ ...plain, [key]: true })).toBe(false);
    });

    test('rejects a middle click', () => {
        expect(isSameTabClick({ ...plain, button: 1 })).toBe(false);
    });
});

describe('onSameTabClick', () => {
    test('runs the handler for a plain primary click only', () => {
        const handler = vi.fn();
        const onClick = onSameTabClick(handler);

        onClick({ ...plain, ctrlKey: true });
        expect(handler).not.toHaveBeenCalled();

        onClick(plain);
        expect(handler).toHaveBeenCalledTimes(1);
    });
});
