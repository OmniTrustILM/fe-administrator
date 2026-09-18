import { X } from 'lucide-react';
import Button from 'components/Button';
import Label from 'components/Label';
import Toggletip from 'components/Toggletip';
import TextInput from 'components/TextInput';
import { BRAND_COLOR_MESSAGE, isBrandColor } from 'utils/branding';

type Props = {
    id: string;
    label: string;
    scope?: string;
    description: string;
    value: string;
    defaultColor: string;
    onChange: (value: string) => void;
    disabled?: boolean;
};

/**
 * One brand colour: a hex field and a native `input type=color`, kept in sync in both directions.
 *
 * The swatch cannot hold an empty or malformed value, so it shows `defaultColor` instead - for display only, never
 * written back. Handing it `''` would leave React believing the value is empty while the browser shows a colour and
 * rewrites it on every render.
 *
 * An empty field is valid and means unset: Core clears any field left out, so only a non-empty value that is not a
 * six-digit hex is an error, and clearing needs its own control because neither the swatch nor a picker can express
 * "no colour". Both the swatch fallback and the placeholder name this field's own default, since an unset field is
 * the one that will use it.
 *
 * `scope` names the composition a colour is limited to. It sits inside the `label` element so it is part of the
 * field's accessible name, and the controls keep naming the colour alone, which is what identifies them.
 */
function ColorField({ id, label, scope, description, value, defaultColor, onChange, disabled = false }: Readonly<Props>) {
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
                    {scope && <span className="font-normal text-content-subtle">{` (${scope})`}</span>}
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
                        placeholder={defaultColor}
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
                        value={isBrandColor(value) ? value : defaultColor}
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
