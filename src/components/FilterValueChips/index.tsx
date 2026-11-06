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
                        // biome-ignore lint/a11y/useSemanticElements: the chip sits inside the filter badge's own <button>, so a nested <button> would be invalid
                        <span
                            role="button" // NOSONAR(S6819): the chip sits inside the filter badge's own <button>, so a nested <button> would be invalid
                            tabIndex={0}
                            aria-label={filterLabel ? `Remove ${value} from ${filterLabel}` : `Remove ${value}`}
                            className="shrink-0 inline-flex items-center justify-center rounded-full size-3.5 hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-brand"
                            onClick={(event) => {
                                event.stopPropagation();
                                onRemoveValue(index);
                            }}
                            onKeyDown={(event) => {
                                if (event.key !== 'Enter' && event.key !== ' ') return;
                                event.preventDefault();
                                event.stopPropagation();
                                onRemoveValue(index);
                            }}
                        >
                            <X className="size-3" aria-hidden />
                        </span>
                    )}
                </span>
            ))}
        </span>
    );
}

export default FilterValueChips;
