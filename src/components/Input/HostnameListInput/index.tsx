import { X } from 'lucide-react';
import { useCallback, useState } from 'react';

import Button from 'components/Button';
import { inputBaseClassName } from 'components/TextInput/inputStyles';

type Props = {
    id?: string;
    values: string[];
    onValuesChange: (values: string[]) => void;
    placeholder?: string;
    addLabel?: string;
    validateValue?: (value: string) => string | undefined;
    invalid?: boolean;
};

export default function HostnameListInput({
    id,
    values,
    onValuesChange,
    placeholder,
    addLabel = 'Add',
    validateValue,
    invalid = false,
}: Readonly<Props>) {
    const [draft, setDraft] = useState('');
    const [draftError, setDraftError] = useState<string | undefined>(undefined);

    const tryAdd = useCallback(() => {
        const trimmed = draft.trim();
        if (!trimmed) return;

        if (values.includes(trimmed)) {
            setDraftError('Value already added');
            return;
        }

        const validationError = validateValue?.(trimmed);
        if (validationError) {
            setDraftError(validationError);
            return;
        }

        onValuesChange([...values, trimmed]);
        setDraft('');
        setDraftError(undefined);
    }, [draft, values, onValuesChange, validateValue]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                tryAdd();
            }
        },
        [tryAdd],
    );

    const removeValue = useCallback(
        (value: string) => {
            onValuesChange(values.filter((v) => v !== value));
        },
        [values, onValuesChange],
    );

    return (
        <div className="flex flex-col gap-2">
            <div className="flex gap-2">
                <input
                    id={id}
                    type="text"
                    className={`${inputBaseClassName} flex-1${invalid || draftError ? ' border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                    value={draft}
                    onChange={(e) => {
                        setDraft(e.target.value);
                        if (draftError) setDraftError(undefined);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    autoComplete="off"
                    data-testid={id ? `hostname-list-input-${id}` : 'hostname-list-input'}
                />
                <Button type="button" variant="outline" onClick={tryAdd} disabled={!draft.trim()}>
                    {addLabel}
                </Button>
            </div>
            {draftError && <p className="text-xs text-red-600">{draftError}</p>}
            {values.length > 0 && (
                <ul className="flex flex-wrap gap-2" data-testid={id ? `hostname-list-tags-${id}` : 'hostname-list-tags'}>
                    {values.map((value) => (
                        <li
                            key={value}
                            className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 py-1 pl-3 pr-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-200"
                        >
                            <span>{value}</span>
                            <button
                                type="button"
                                onClick={() => removeValue(value)}
                                className="inline-flex items-center justify-center rounded-full p-0.5 text-blue-700 hover:bg-blue-100 hover:text-blue-900 focus:outline-none focus:bg-blue-100 dark:text-blue-200 dark:hover:bg-blue-800/50"
                                aria-label={`Remove ${value}`}
                                data-testid={`hostname-list-remove-${value}`}
                            >
                                <X className="size-3" aria-hidden />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
