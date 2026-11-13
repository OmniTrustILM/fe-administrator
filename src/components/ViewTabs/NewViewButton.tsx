import { Plus } from 'lucide-react';

type Props = Readonly<{
    onClick: () => void;
    disabled?: boolean;
    dataTestId: string;
}>;

export default function NewViewButton({ onClick, disabled, dataTestId }: Props) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label="New view"
            title="New view"
            data-testid={dataTestId}
            className="inline-flex items-center rounded-lg p-3 text-content-subtle hover:bg-surface-hover hover:text-content focus:outline-hidden disabled:opacity-50"
        >
            <Plus className="size-4" />
        </button>
    );
}
