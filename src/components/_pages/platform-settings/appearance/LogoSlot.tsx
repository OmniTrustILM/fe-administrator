import { useRef } from 'react';
import { Trash2, Upload } from 'lucide-react';
import Button from 'components/Button';
import { LOGO_ACCEPT, LOGO_HELP } from 'utils/branding';

type Props = {
    id: string;
    label: string;
    /** The pending selection before save, or the stored logo afterwards. Always a data URI. */
    value?: string;
    fileName?: string;
    error?: string;
    onSelect: (file: File) => void;
    onDelete: () => void;
    disabled?: boolean;
};

/**
 * One logo slot. The preview is an `img` pointed at the data URI and never inlined markup: an operator-supplied SVG is
 * rendered to unauthenticated visitors on the login page, so inlining it would make the slot a stored-XSS surface.
 */
function LogoSlot({ id, label, value, fileName, error, onSelect, onDelete, disabled = false }: Readonly<Props>) {
    const inputRef = useRef<HTMLInputElement>(null);
    const errorId = `${id}-error`;

    return (
        <div className="flex flex-col gap-2" data-testid={`logo-slot-${id}`}>
            <span className="text-sm font-medium text-content">{label}</span>

            <div className="flex items-center gap-3">
                <div className="flex h-16 w-28 shrink-0 items-center justify-center rounded-lg border border-divider bg-surface-sunken p-1">
                    {value ? (
                        <img src={value} alt={`${label} preview`} className="max-h-full max-w-full" data-testid={`logo-preview-${id}`} />
                    ) : (
                        <span className="text-xs text-content-subtle" data-testid={`logo-empty-${id}`}>
                            No logo
                        </span>
                    )}
                </div>

                <div className="flex flex-col items-start gap-1">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            color="secondary"
                            disabled={disabled}
                            onClick={() => inputRef.current?.click()}
                            data-testid={`logo-choose-${id}`}
                        >
                            <Upload size={16} aria-hidden="true" />
                            Choose file
                        </Button>
                        <Button
                            variant="outline"
                            color="danger"
                            disabled={disabled || !value}
                            onClick={onDelete}
                            aria-label={`Delete ${label}`}
                            data-testid={`logo-delete-${id}`}
                        >
                            <Trash2 size={16} aria-hidden="true" />
                        </Button>
                    </div>
                    <span className="text-xs text-content-subtle" data-testid={`logo-filename-${id}`}>
                        {fileName ?? (value ? 'Stored logo' : 'No file selected')}
                    </span>
                </div>
            </div>

            {/* Hidden rather than styled: a file input cannot be restyled, and the visible control above drives it. */}
            <input
                ref={inputRef}
                type="file"
                accept={LOGO_ACCEPT}
                className="sr-only"
                aria-label={label}
                aria-describedby={error ? errorId : undefined}
                disabled={disabled}
                data-testid={`logo-input-${id}`}
                onChange={(event) => {
                    const file = event.target.files?.[0];

                    if (file) {
                        onSelect(file);
                    }
                    // Cleared so re-choosing the same file after a rejection still fires a change event.
                    event.target.value = '';
                }}
            />

            <p className="text-xs text-content-subtle">{LOGO_HELP}</p>
            {error && (
                <p id={errorId} className="text-xs text-danger" role="alert" data-testid={`logo-error-${id}`}>
                    {error}
                </p>
            )}
        </div>
    );
}

export default LogoSlot;
