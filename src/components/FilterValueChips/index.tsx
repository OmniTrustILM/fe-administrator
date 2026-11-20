import { X } from 'lucide-react';

type Props = Readonly<{
    values: string[];
    filterLabel?: string;
    onRemoveValue?: (index: number) => void;
}>;

function FilterValueChips({ values, filterLabel, onRemoveValue }: Props) {
    return (
        <span className="inline-flex flex-wrap items-center gap-1">
            {values.map((value, index) => (
                <span
                    key={index} // NOSONAR(S6479): filter values may repeat and carry no identity of their own
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
