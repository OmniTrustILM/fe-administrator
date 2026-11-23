import { X } from 'lucide-react';
import { useLayoutEffect, useRef } from 'react';

type Props = Readonly<{
    values: string[];
    filterLabel?: string;
    onRemoveValue?: (index: number) => void;
}>;

/** Values may repeat, so a value's key also counts how often it appeared before. */
function toChipKeys(values: string[]): string[] {
    const seen = new Map<string, number>();
    return values.map((value) => {
        const count = seen.get(value) ?? 0;
        seen.set(value, count + 1);
        return `${value}\u0000${count}`;
    });
}

function FilterValueChips({ values, filterLabel, onRemoveValue }: Props) {
    const containerRef = useRef<HTMLSpanElement>(null);
    const focusAfterRemoval = useRef<number | undefined>(undefined);
    const keys = toChipKeys(values);

    // The removed chip takes its focused button with it, so focus moves to the chip now in its place, or the last one.
    // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on `values`, which a removal changes; keyed on nothing it runs every render.
    useLayoutEffect(() => {
        const index = focusAfterRemoval.current;
        if (index === undefined) return;
        focusAfterRemoval.current = undefined;
        const buttons = containerRef.current?.querySelectorAll('button');
        if (buttons?.length) buttons[Math.min(index, buttons.length - 1)].focus();
    }, [values]);

    const removeValue = (index: number) => {
        if (values.length > 1) focusAfterRemoval.current = index;
        onRemoveValue?.(index);
    };

    return (
        <span ref={containerRef} className="inline-flex flex-wrap items-center gap-1">
            {values.map((value, index) => (
                <span
                    key={keys[index]}
                    className="inline-flex items-center gap-x-0.5 rounded-sm bg-surface-raised text-content inset-ring-1 inset-ring-outline px-1.5 py-px"
                    data-testid="filter-value-chip"
                >
                    {value}
                    {onRemoveValue && (
                        <button
                            type="button"
                            aria-label={filterLabel ? `Remove ${value} from ${filterLabel}` : `Remove ${value}`}
                            className="shrink-0 inline-flex items-center justify-center rounded-full size-3.5 cursor-pointer hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-brand"
                            onClick={() => removeValue(index)}
                        >
                            <X className="size-3" aria-hidden />
                        </button>
                    )}
                </span>
            ))}
        </span>
    );
}

export default FilterValueChips;
