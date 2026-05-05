import { useLayoutEffect, useMemo, useState } from 'react';
import Select from './index';

export function SelectHSSelectValueChangeHarness() {
    const [value, setValue] = useState<string>('1');
    const options = useMemo(
        () => [
            { value: '1', label: 'One' },
            { value: '2', label: 'Two' },
        ],
        [],
    );

    useLayoutEffect(() => {
        const state = { close: 0, destroy: 0, autoInit: 0 };
        (globalThis as any).__hsState = state;
        const instance = {
            isOpened: () => true,
            close: () => {
                state.close += 1;
            },
            destroy: () => {
                state.destroy += 1;
            },
        };
        (globalThis as any).HSSelect = {
            getInstance: () => instance,
            autoInit: () => {
                state.autoInit += 1;
            },
        };
        return () => {
            delete (globalThis as any).__hsState;
            delete (globalThis as any).HSSelect;
        };
    }, []);

    return (
        <div>
            <button data-testid="set-second" onClick={() => setValue('2')}>
                set second
            </button>
            <Select id="hs-value-change" value={value} onChange={() => {}} options={options} />
        </div>
    );
}

export function SelectTooltipSyncHarness() {
    const options = [{ value: '1', label: 'One' }];

    useLayoutEffect(() => {
        const dropdown = document.createElement('div');
        dropdown.id = 'hs-tooltip-dropdown';
        dropdown.className = 'hs-select-dropdown';
        dropdown.innerHTML = `
          <div class="hs-select-option-row">
            <span data-title>Option title</span>
            <span data-tooltip-content></span>
          </div>
        `;
        document.body.appendChild(dropdown);
        (globalThis as any).__tooltipCalls = 0;
        (globalThis as any).HSSelect = {
            getInstance: () => ({ dropdown }),
            autoInit: () => {},
        };
        (globalThis as any).HSTooltip = {
            autoInit: () => {
                (globalThis as any).__tooltipCalls += 1;
            },
        };
        return () => {
            dropdown.remove();
            delete (globalThis as any).__tooltipCalls;
            delete (globalThis as any).HSSelect;
            delete (globalThis as any).HSTooltip;
        };
    }, []);

    return <Select id="hs-tooltip-sync" value="" onChange={() => {}} options={options} />;
}

// --------------------------------------------------------------------------------------------------------------
// Parameterized harness for scenarios where the <Select> options arrive AFTER the component has mounted.
// Covers both single and multi modes and captures the native <select>'s state at each HSSelect.autoInit() call
// so tests can verify syncNativeSelection runs before HSSelect re-initializes.
// --------------------------------------------------------------------------------------------------------------
type LateOptionsCapture = string | string[];

type LateOptionsHarnessProps = Readonly<{
    mode: 'single' | 'multi';
    id: string;
    stateKey: string;
    loadTestId: string;
    loadOptions: { value: string; label: string }[];
    initialSingleValue?: string;
    initialMultiValue?: { value: string; label: string }[];
}>;

export function SelectLateOptionsHarness({
    mode,
    id,
    stateKey,
    loadTestId,
    loadOptions,
    initialSingleValue,
    initialMultiValue,
}: LateOptionsHarnessProps) {
    const [options, setOptions] = useState<{ value: string; label: string }[]>([]);

    useLayoutEffect(() => {
        const state: { destroy: number; autoInit: number; initialized: boolean; captures: LateOptionsCapture[] } = {
            destroy: 0,
            autoInit: 0,
            initialized: false,
            captures: [],
        };
        (globalThis as any)[stateKey] = state;
        const instanceFor = (el: HTMLSelectElement) => ({
            isOpened: () => false,
            close: () => {},
            destroy: () => {
                state.destroy += 1;
                // Simulate real HSSelect clearing selection on destroy.
                if (mode === 'multi') {
                    Array.from(el.options).forEach((o) => {
                        o.selected = false;
                    });
                } else {
                    el.value = '';
                }
            },
        });
        (globalThis as any).HSSelect = {
            // Real HSSelect has no instance until autoInit() has run; mirror that so the initial
            // optionsChanged pass takes the no-instance branch rather than destroying a phantom widget.
            getInstance: (el: HTMLSelectElement) => (state.initialized ? instanceFor(el) : undefined),
            autoInit: () => {
                state.autoInit += 1;
                state.initialized = true;
                const sel = document.getElementById(id) as HTMLSelectElement | null;
                if (mode === 'multi') {
                    state.captures.push(sel ? Array.from(sel.selectedOptions).map((o) => o.value) : []);
                } else {
                    state.captures.push(sel?.value ?? '');
                }
            },
        };
        return () => {
            delete (globalThis as any)[stateKey];
            delete (globalThis as any).HSSelect;
        };
    }, [id, stateKey, mode]);

    return (
        <div>
            <button data-testid={loadTestId} onClick={() => setOptions(loadOptions)}>
                Load Options
            </button>
            {mode === 'multi' ? (
                <Select id={id} value={initialMultiValue ?? []} onChange={() => {}} options={options} isMulti={true} />
            ) : (
                <Select id={id} value={initialSingleValue ?? ''} onChange={() => {}} options={options} />
            )}
        </div>
    );
}
