import { X } from 'lucide-react';

type Props = Readonly<{
    onClick: () => void;
    dataTestId: string;
}>;

export default function DismissButton({ onClick, dataTestId }: Props) {
    return (
        <button
            type="button"
            aria-label="Dismiss"
            onClick={onClick}
            className="ml-auto flex size-8 shrink-0 items-center justify-center rounded-md text-content-muted hover:bg-surface-hover hover:text-content focus-visible:outline-2 focus-visible:outline-offset-2"
            data-testid={dataTestId}
        >
            <X size={16} aria-hidden="true" />
        </button>
    );
}
