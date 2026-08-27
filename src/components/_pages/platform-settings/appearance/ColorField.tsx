import TextInput from 'components/TextInput';
import { BRAND_COLOR_MESSAGE, isBrandColor } from 'utils/branding';

type Props = {
    id: string;
    label: string;
    hint: string;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
};

/**
 * One brand colour: a hex field and a swatch, kept in sync in both directions. The swatch is a native `input type=color`
 * rather than a picker component, so it is keyboard operable and themed by the platform for free. It cannot express an
 * empty or malformed value, so it falls back to black for display only and never writes that back on its own.
 *
 * An empty field is valid and means the colour is unset - Core clears any field left out - so only a non-empty value
 * that is not a six-digit hex is an error.
 */
function ColorField({ id, label, hint, value, onChange, disabled = false }: Readonly<Props>) {
    const valid = value === '' || isBrandColor(value);
    const errorId = `${id}-error`;

    return (
        <div className="flex flex-col gap-1" data-testid={`color-field-${id}`}>
            <div className="flex items-end gap-3">
                <div className="grow">
                    <TextInput
                        id={id}
                        label={label}
                        value={value}
                        onChange={onChange}
                        disabled={disabled}
                        placeholder="#0073CF"
                        invalid={!valid}
                        dataTestId={`color-hex-${id}`}
                        ariaDescribedBy={valid ? undefined : errorId}
                    />
                </div>
                <input
                    type="color"
                    aria-label={`${label} color picker`}
                    className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-outline bg-surface-raised p-1 disabled:cursor-not-allowed disabled:opacity-35"
                    value={valid ? value : '#000000'}
                    disabled={disabled}
                    onChange={(event) => onChange(event.target.value.toUpperCase())}
                    data-testid={`color-swatch-${id}`}
                />
            </div>
            <p className="text-xs text-content-subtle">{hint}</p>
            {!valid && (
                <p id={errorId} className="text-xs text-danger" data-testid={`color-error-${id}`}>
                    {BRAND_COLOR_MESSAGE}
                </p>
            )}
        </div>
    );
}

export default ColorField;
