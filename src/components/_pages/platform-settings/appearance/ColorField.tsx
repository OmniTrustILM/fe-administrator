import { X } from 'lucide-react';
import Button from 'components/Button';
import Label from 'components/Label';
import Toggletip from 'components/Toggletip';
import TextInput from 'components/TextInput';
import { BRAND_COLOR_MESSAGE, isBrandColor } from 'utils/branding';

type Props = {
    id: string;
    label: string;
    description: string;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
};

/**
 * One brand colour: a hex field and a swatch, kept in sync in both directions. The swatch is a native `input type=color`
 * rather than a picker component, so it is keyboard operable and themed by the platform for free. It cannot express an
 * empty or malformed value, so it falls back to black for display only and never writes that back on its own. That
 * fallback asks a different question from `valid` below: whether the control can render the value at all, not whether
 * the value is acceptable input. An empty string is acceptable input the control cannot hold, and handing it one
 * leaves React believing the value is `''` while the browser shows `#000000`, rewritten on every render.
 *
 * An empty field is valid and means the colour is unset - Core clears any field left out - so only a non-empty value
 * that is not a six-digit hex is an error. Clearing it needs its own control for the same reason the swatch shows
 * black: neither the swatch nor a colour picker can express "no colour".
 */
function ColorField({ id, label, description, value, onChange, disabled = false }: Readonly<Props>) {
    const valid = value === '' || isBrandColor(value);
    const errorId = `${id}-error`;

    // Clearing removes the button that was just activated, so focus would fall to the document body and a keyboard
    // operator would tab in from the top of the page again. It moves to the field the button emptied.
    const onClear = () => {
        onChange('');
        document.getElementById(id)?.focus();
    };

    return (
        <div className="flex flex-col gap-1" data-testid={`color-field-${id}`}>
            <div className="flex items-center gap-1.5">
                <Label htmlFor={id} className="!mb-0">
                    {label}
                </Label>
                <Toggletip ariaLabel={`About the ${label} color`} content={description} dataTestId={`color-help-${id}`} />
            </div>
            <div className="flex items-stretch gap-3">
                <div className="grow">
                    <TextInput
                        id={id}
                        value={value}
                        onChange={onChange}
                        disabled={disabled}
                        placeholder="#0073CF"
                        invalid={!valid}
                        dataTestId={`color-hex-${id}`}
                        ariaDescribedBy={valid ? undefined : errorId}
                    />
                </div>
                <div className="flex w-12 shrink-0">
                    <input
                        type="color"
                        aria-label={`${label} color picker`}
                        className="h-full w-full cursor-pointer rounded-lg border border-outline bg-surface-raised p-1 disabled:cursor-not-allowed disabled:opacity-35"
                        value={isBrandColor(value) ? value : '#000000'}
                        disabled={disabled}
                        onChange={(event) => onChange(event.target.value.toUpperCase())}
                        data-testid={`color-swatch-${id}`}
                    />
                </div>
                {value !== '' && (
                    <Button
                        variant="outline"
                        color="secondary"
                        disabled={disabled}
                        onClick={onClear}
                        aria-label={`Clear ${label}`}
                        data-testid={`color-clear-${id}`}
                    >
                        <X size={16} aria-hidden="true" />
                    </Button>
                )}
            </div>
            {!valid && (
                <p id={errorId} className="text-xs text-danger" data-testid={`color-error-${id}`}>
                    {BRAND_COLOR_MESSAGE}
                </p>
            )}
        </div>
    );
}

export default ColorField;
