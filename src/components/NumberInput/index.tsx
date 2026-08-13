import { Minus, Plus } from 'lucide-react';

type Props = {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    zeroPad?: boolean;
};

export default function NumberInput({ value, onChange, min = 0, max = 999, step = 1, disabled = false, zeroPad = false }: Readonly<Props>) {
    const decrement = () => onChange(Math.max(min, value - step));
    const increment = () => onChange(Math.min(max, value + step));

    const buttonClass =
        'size-6 inline-flex justify-center items-center text-sm font-medium rounded-md bg-surface-raised border border-outline text-content shadow-xs hover:bg-surface-hover focus:outline-none disabled:opacity-50 disabled:pointer-events-none';

    return (
        <div className="py-1.5 px-2 inline-flex bg-surface-raised border border-outline rounded-lg">
            <div className="flex items-center gap-x-1.5">
                <button type="button" onClick={decrement} disabled={disabled || value <= min} aria-label="Decrease" className={buttonClass}>
                    <Minus className="size-3.5 shrink-0" />
                </button>
                <input
                    type="text"
                    inputMode="numeric"
                    value={zeroPad ? String(value).padStart(2, '0') : String(value)}
                    disabled={disabled}
                    onChange={(e) => {
                        const n = Number.parseInt(e.target.value, 10);
                        if (!Number.isNaN(n) && n >= min && n <= max) onChange(n);
                    }}
                    aria-roledescription="Number field"
                    className="p-0 w-8 bg-transparent border-0 text-content text-center text-sm focus:ring-0"
                />
                <button type="button" onClick={increment} disabled={disabled || value >= max} aria-label="Increase" className={buttonClass}>
                    <Plus className="size-3.5 shrink-0" />
                </button>
            </div>
        </div>
    );
}
