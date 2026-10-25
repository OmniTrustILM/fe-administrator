import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, test } from 'vitest';
import MultipleValueTextInput from './index';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

test('the add-value textbox has an accessible name even before a value is entered', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    try {
        await act(async () => {
            root.render(<MultipleValueTextInput selectedValues={[]} onValuesChange={() => {}} addPlaceholder="Add delegate" />);
        });

        expect(container.querySelector('input[type="text"]')?.getAttribute('aria-label')).toBe('Add delegate');
    } finally {
        await act(async () => root.unmount());
        container.remove();
    }
});
