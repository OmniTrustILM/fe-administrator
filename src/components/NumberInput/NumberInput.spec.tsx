import { test, expect } from '../../../playwright/ct-test';
import NumberInput from './index';

test.describe('NumberInput', () => {
    test('should render with value', async ({ mount }) => {
        const component = await mount(<NumberInput value={5} onChange={() => {}} />);
        await expect(component.getByRole('textbox')).toHaveValue('5');
    });

    test('should display zero-padded value when zeroPad is true', async ({ mount }) => {
        const component = await mount(<NumberInput value={6} onChange={() => {}} zeroPad />);
        await expect(component.getByRole('textbox')).toHaveValue('06');
    });

    test('should not pad value >= 10 when zeroPad is true', async ({ mount }) => {
        const component = await mount(<NumberInput value={15} onChange={() => {}} zeroPad />);
        await expect(component.getByRole('textbox')).toHaveValue('15');
    });

    test('should call onChange with incremented value when + is clicked', async ({ mount }) => {
        let value = 5;
        const component = await mount(
            <NumberInput
                value={value}
                onChange={(v) => {
                    value = v;
                }}
            />,
        );
        await component.getByLabel('Increase').click();
        await expect.poll(() => value, { timeout: 2000 }).toBe(6);
        expect(value).toBe(6);
    });

    test('should call onChange with decremented value when - is clicked', async ({ mount }) => {
        let value = 5;
        const component = await mount(
            <NumberInput
                value={value}
                onChange={(v) => {
                    value = v;
                }}
            />,
        );
        await component.getByLabel('Decrease').click();
        await expect.poll(() => value, { timeout: 2000 }).toBe(4);
        expect(value).toBe(4);
    });

    test('should increment by step value', async ({ mount }) => {
        let value = 5;
        const component = await mount(
            <NumberInput
                value={value}
                onChange={(v) => {
                    value = v;
                }}
                step={5}
            />,
        );
        await component.getByLabel('Increase').click();
        await expect.poll(() => value, { timeout: 2000 }).toBe(10);
        expect(value).toBe(10);
    });

    test('should disable increase button when value equals max', async ({ mount }) => {
        const component = await mount(<NumberInput value={10} onChange={() => {}} max={10} />);
        await expect(component.getByLabel('Increase')).toBeDisabled();
    });

    test('should disable decrease button when value equals min', async ({ mount }) => {
        const component = await mount(<NumberInput value={0} onChange={() => {}} min={0} />);
        await expect(component.getByLabel('Decrease')).toBeDisabled();
    });

    test('should disable all controls when disabled prop is true', async ({ mount }) => {
        const component = await mount(<NumberInput value={5} onChange={() => {}} disabled />);
        await expect(component.getByRole('textbox')).toBeDisabled();
        await expect(component.getByLabel('Increase')).toBeDisabled();
        await expect(component.getByLabel('Decrease')).toBeDisabled();
    });

    test('should call onChange when value is typed directly', async ({ mount }) => {
        let value = 5;
        const component = await mount(
            <NumberInput
                value={value}
                onChange={(v) => {
                    value = v;
                }}
                min={0}
                max={99}
            />,
        );
        await component.getByRole('textbox').fill('20');
        await expect.poll(() => value, { timeout: 2000 }).toBe(20);
        expect(value).toBe(20);
    });

    test('should not call onChange when typed value is out of range', async ({ mount }) => {
        let changed = false;
        const component = await mount(
            <NumberInput
                value={5}
                onChange={() => {
                    changed = true;
                }}
                min={0}
                max={10}
            />,
        );
        await component.getByRole('textbox').fill('99');
        await component.getByRole('textbox').blur();
        expect(changed).toBe(false);
    });
});
