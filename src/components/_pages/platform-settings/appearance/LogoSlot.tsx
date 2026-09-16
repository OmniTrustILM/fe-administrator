import { useRef, useState, type DragEvent } from 'react';
import cn from 'classnames';
import { Trash2, Upload } from 'lucide-react';
import Button from 'components/Button';
import Label from 'components/Label';
import { LOGO_ACCEPT } from 'utils/branding';

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
 *
 * The preview doubles as the drop zone and the file picker's trigger, so it is a `button` rather than a `div`: a
 * drop target is invisible to anyone not using a mouse, and the same box then stays reachable by keyboard.
 */
function LogoSlot({ id, label, value, fileName, error, onSelect, onDelete, disabled = false }: Readonly<Props>) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const errorId = `${id}-error`;

    // Dragging over a child fires dragleave on the element being left, so the counter keeps the highlight from
    // flickering off while the pointer is still inside the zone.
    const dragDepth = useRef(0);

    const onDragEnter = (event: DragEvent<HTMLButtonElement>) => {
        if (disabled) {
            return;
        }

        event.preventDefault();
        dragDepth.current += 1;
        setIsDraggingOver(true);
    };

    const onDragLeave = () => {
        dragDepth.current -= 1;

        if (dragDepth.current <= 0) {
            dragDepth.current = 0;
            setIsDraggingOver(false);
        }
    };

    const onDrop = (event: DragEvent<HTMLButtonElement>) => {
        event.preventDefault();
        dragDepth.current = 0;
        setIsDraggingOver(false);

        if (disabled) {
            return;
        }

        const file = event.dataTransfer.files?.[0];

        if (file) {
            onSelect(file);
        }
    };

    return (
        <div className="flex flex-col gap-2" data-testid={`logo-slot-${id}`}>
            <Label htmlFor={id} className="!mb-0">
                {label}
            </Label>

            <div className="flex items-start gap-3">
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => inputRef.current?.click()}
                    onDragEnter={onDragEnter}
                    // Without preventDefault the browser navigates to the dropped file instead of firing onDrop.
                    onDragOver={(event) => event.preventDefault()}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    className={cn(
                        'flex h-24 grow items-center justify-center rounded-lg border border-dashed p-2 transition-colors',
                        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                        isDraggingOver ? 'border-brand bg-brand-subtle' : 'border-outline bg-surface-sunken',
                        !isDraggingOver && !disabled && 'hover:border-brand',
                        value && !isDraggingOver && 'border-solid border-divider bg-surface-raised',
                    )}
                    id={`${id}-dropzone`}
                    // A filled slot would otherwise be named by the preview's alt text alone, which says what the
                    // image is and not that activating the button replaces it.
                    aria-label={value ? `Replace ${label} logo` : `Add ${label} logo`}
                    data-testid={`logo-choose-${id}`}
                >
                    {value ? (
                        <img
                            src={value}
                            alt={`${label} logo preview`}
                            className="max-h-full max-w-full"
                            data-testid={`logo-preview-${id}`}
                        />
                    ) : (
                        <span className="flex flex-col items-center gap-1 text-xs text-content-subtle" data-testid={`logo-empty-${id}`}>
                            <Upload size={18} aria-hidden="true" />
                            Drop a logo here, or click to choose
                        </span>
                    )}
                </button>

                {value && (
                    <Button
                        variant="outline"
                        color="danger"
                        disabled={disabled}
                        onClick={() => {
                            onDelete();
                            document.getElementById(`${id}-dropzone`)?.focus();
                        }}
                        aria-label={`Delete ${label} logo`}
                        data-testid={`logo-delete-${id}`}
                    >
                        <Trash2 size={16} aria-hidden="true" />
                    </Button>
                )}
            </div>

            <span className="text-xs text-content-subtle" data-testid={`logo-filename-${id}`}>
                {fileName ?? (value ? 'Stored logo' : 'No file selected')}
            </span>

            {/* Hidden rather than styled: a file input cannot be restyled, and the visible control above drives it. */}
            <input
                ref={inputRef}
                id={id}
                type="file"
                accept={LOGO_ACCEPT}
                className="sr-only"
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

            {error && (
                <p id={errorId} className="text-xs text-danger" role="alert" data-testid={`logo-error-${id}`}>
                    {error}
                </p>
            )}
        </div>
    );
}

export default LogoSlot;
