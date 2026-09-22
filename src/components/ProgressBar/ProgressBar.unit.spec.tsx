import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';

import ProgressBar, { progressRatio } from './index';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('progressRatio', () => {
    it('is the clamped fraction when both figures are known', () => {
        expect(progressRatio(12, 30)).toBeCloseTo(0.4);
        expect(progressRatio(0, 30)).toBe(0);
        expect(progressRatio(30, 30)).toBe(1);
    });

    it('does not spill past the track when the value overshoots a shrinking estimate', () => {
        expect(progressRatio(45, 30)).toBe(1);
        expect(progressRatio(-3, 30)).toBe(0);
    });

    it.each([
        ['no value', undefined, 30],
        ['no total', 12, undefined],
        ['neither', undefined, undefined],
        ['a zero total', 0, 0],
        ['a negative total', 4, -1],
        ['a non-finite total', 4, Number.POSITIVE_INFINITY],
    ])('has nothing to draw with %s', (_label, value, max) => {
        expect(progressRatio(value, max)).toBeUndefined();
    });
});

describe('ProgressBar', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(async () => {
        await act(async () => root.unmount());
        container.remove();
    });

    const render = async (element: React.ReactElement) => {
        await act(async () => root.render(element));
    };

    const track = () => container.querySelector<HTMLElement>('[role="progressbar"]');
    const fill = () => container.querySelector<HTMLElement>('[data-testid="progress-bar-fill"]');

    it('renders a determinate bar sized to value over max', async () => {
        await render(<ProgressBar value={12} max={30} ariaLabel="Targets" />);

        expect(track()?.getAttribute('aria-valuenow')).toBe('12');
        expect(track()?.getAttribute('aria-valuemax')).toBe('30');
        expect(track()?.hasAttribute('data-indeterminate')).toBe(false);
        expect(fill()?.style.width).toBe('40%');
    });

    it('renders indeterminate when the total is absent rather than computing a percentage', async () => {
        await render(<ProgressBar value={12} />);

        expect(track()?.getAttribute('data-indeterminate')).toBe('true');
        expect(track()?.hasAttribute('aria-valuenow')).toBe(false);
        expect(track()?.hasAttribute('aria-valuemax')).toBe(false);
        expect(fill()?.style.width).toBe('');
    });

    it('renders indeterminate when the value is absent', async () => {
        await render(<ProgressBar max={30} />);

        expect(track()?.getAttribute('data-indeterminate')).toBe('true');
    });

    it('never defaults a missing max to 100', async () => {
        await render(<ProgressBar value={50} />);

        expect(fill()?.style.width).not.toBe('50%');
        expect(track()?.getAttribute('data-indeterminate')).toBe('true');
    });

    it('shows a full track for a run that is done, and an empty one for a run that has not started', async () => {
        await render(<ProgressBar value={30} max={30} />);
        expect(fill()?.style.width).toBe('100%');

        await render(<ProgressBar value={0} max={30} />);
        expect(fill()?.style.width).toBe('0%');
        expect(track()?.hasAttribute('data-indeterminate')).toBe(false);
    });

    it('keeps aria-valuenow inside the range even when the value overshoots or undershoots', async () => {
        await render(<ProgressBar value={45} max={30} ariaLabel="Targets" />);
        expect(track()?.getAttribute('aria-valuenow')).toBe('30');

        await render(<ProgressBar value={-3} max={30} ariaLabel="Targets" />);
        expect(track()?.getAttribute('aria-valuenow')).toBe('0');
    });

    it('names itself from its label when no aria-label is given', async () => {
        await render(<ProgressBar value={1} max={4} label={<span>Targets</span>} />);

        const labelledBy = track()?.getAttribute('aria-labelledby');
        expect(labelledBy).toBeTruthy();
        expect(container.querySelector(`[id="${labelledBy}"]`)?.textContent).toContain('Targets');
    });

    it('tells assistive technology the total is unknown when it renders indeterminate', async () => {
        await render(<ProgressBar value={12} ariaLabel="Targets" />);

        expect(track()?.getAttribute('aria-valuetext')).toBe('total unknown');
    });

    it('renders the label and caption it is given', async () => {
        await render(<ProgressBar value={1} max={4} label={<span>Targets</span>} caption="as of 14:32" />);

        expect(container.textContent).toContain('Targets');
        expect(container.textContent).toContain('as of 14:32');
    });
});
