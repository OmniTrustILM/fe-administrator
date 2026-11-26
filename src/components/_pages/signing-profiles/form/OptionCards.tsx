import type { ReactElement } from 'react';

interface Props<T extends string> {
    name: string;
    label: string;
    options: readonly { value: T; label: string }[];
    selected: T;
    onSelect: (value: T) => void;
}

/** Required single-choice group whose options render as selectable cards. */
export default function OptionCards<T extends string>({ name, label, options, selected, onSelect }: Readonly<Props<T>>): ReactElement {
    return (
        <div>
            <p className="block text-sm font-medium text-content-muted mb-2">
                {label} <span className="text-danger">*</span>
            </p>
            <div className="space-y-2">
                {options.map((option) => {
                    const isSelected = option.value === selected;
                    return (
                        <label
                            key={option.value}
                            className={`flex items-center gap-x-3 p-3 border rounded-lg cursor-pointer ${
                                isSelected
                                    ? 'border-brand bg-brand-subtle text-content'
                                    : 'border-outline bg-surface-raised text-content hover:border-brand'
                            }`}
                        >
                            <input
                                type="radio"
                                name={name}
                                value={option.value}
                                checked={isSelected}
                                className="not-checked:bg-surface-raised accent-brand-solid"
                                onChange={() => onSelect(option.value)}
                            />
                            <span className="text-sm font-medium">{option.label}</span>
                        </label>
                    );
                })}
            </div>
        </div>
    );
}
