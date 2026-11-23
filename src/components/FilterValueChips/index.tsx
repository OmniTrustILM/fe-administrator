import { X } from 'lucide-react';
import { useLayoutEffect, useRef } from 'react';

type Props = Readonly<{
    values: string[];
    filterLabel?: string;
    onRemoveValue?: (index: number) => void;
    /**
     * The chip whose remove button takes focus, clamped to the last one. Held by the host rather than here, because a
     * busy host unmounts its chips mid-save and they must place focus when they mount again.
     */
    focusIndex?: number;
    onFocusPlaced?: () => void;
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

function FilterValueChips({ values, filterLabel, onRemoveValue, focusIndex, onFocusPlaced }: Props) {
    const containerRef = useRef<HTMLSpanElement>(null);
    const keys = toChipKeys(values);

    // biome-ignore lint/correctness/useExhaustiveDependencies: re-run on `values` too, since the chips the index points into change with them.
    useLayoutEffect(() => {
        if (focusIndex === undefined) return;
        const buttons = containerRef.current?.querySelectorAll('button');
        if (!buttons?.length) return;
        buttons[Math.min(focusIndex, buttons.length - 1)].focus();
        onFocusPlaced?.();
    }, [focusIndex, values, onFocusPlaced]);

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
                            onClick={() => onRemoveValue(index)}
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
