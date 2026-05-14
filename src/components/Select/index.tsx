import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import cn from 'classnames';
import Label from 'components/Label';
import Button from 'components/Button';
import {
    WRAPPER_CLASSES,
    WRAPPER_CLEARABLE_CLASSES,
    TRIGGER_CLASSES,
    TRIGGER_CLEARABLE_CLASSES,
    TRIGGER_DISABLED_CLASSES,
    PLACEHOLDER_CLASSES,
    CHEVRON_CLASSES,
    CONTENT_CLASSES,
    CONTENT_FIXED_WIDTH_CLASSES,
    CONTENT_FLUID_WIDTH_CLASSES,
    SEARCH_WRAPPER_CLASSES,
    SEARCH_INPUT_CLASSES,
    LISTBOX_CLASSES,
    OPTION_CLASSES,
    OPTION_HIGHLIGHTED_CLASSES,
    OPTION_DISABLED_CLASSES,
    OPTION_ADD_NEW_CLASSES,
    OPTION_LABEL_TRUNCATE_CLASSES,
    OPTION_LABEL_WRAP_CLASSES,
    CHIP_CLASSES,
    CHIP_REMOVE_CLASSES,
    CHIP_LABEL_CLASSES,
    SELECTED_ICON_CLASSES,
    NO_OPTIONS_CLASSES,
} from './classes';

export type SingleValue<T> = T | undefined;
export type MultiValue<T> = T[] | undefined;
export type OptionValue = string | number | object;

interface BaseProps {
    id: string;
    options?: {
        value: OptionValue;
        label: string;
        description?: string;
        disabled?: boolean;
    }[];
    className?: string;
    placeholder?: string;
    disabled?: boolean;
    label?: string;
    isDisabled?: boolean;
    placement?: 'top' | 'bottom';
    isClearable?: boolean;
    required?: boolean;
    error?: string;
    isSearchable?: boolean;
    minWidth?: number;
    /** @deprecated Kept for API compatibility. The Radix-based implementation always portals; this prop is a no-op. */
    dropdownScope?: 'window';
    dropdownWidth?: number;
    dataTestId?: string;
    colorizeVersionLabel?: boolean;
    showOptionDescriptionInDropdown?: boolean;
}

interface SingleSelectProps extends BaseProps {
    isMulti?: false;
    value: OptionValue | { value: OptionValue; label: string } | null;
    onChange: (value: OptionValue | { value: OptionValue; label: string } | null) => void;
}

interface MultiSelectProps extends BaseProps {
    isMulti: true;
    value: { value: string | number; label: string }[];
    onChange: (value: { value: string | number; label: string }[] | undefined) => void;
}

type Props = SingleSelectProps | MultiSelectProps;

const getUuidFromValue = (val: any): string | null => {
    if (typeof val === 'object' && val !== null) {
        if (val.uuid && typeof val.uuid === 'string') {
            return val.uuid;
        }
        if (val.data && typeof val.data === 'object' && val.data.uuid && typeof val.data.uuid === 'string') {
            return val.data.uuid;
        }
    }
    return null;
};

const getOptionValueString = (val: OptionValue): string => {
    if (typeof val === 'object' && val !== null) {
        if ('reference' in val && typeof (val as any).reference === 'string') {
            return (val as any).reference;
        }
        const uuid = getUuidFromValue(val);
        if (uuid) {
            return uuid;
        }
        if ('data' in val && (val as any).data !== undefined) {
            const d = (val as any).data;
            if (typeof d === 'string' || typeof d === 'number' || typeof d === 'boolean') {
                return String(d);
            }
            if (typeof d === 'object' && d !== null) {
                return JSON.stringify(d);
            }
        }
        return JSON.stringify(val);
    }
    return String(val);
};

const valuesMatch = (val1: any, val2: any): boolean => {
    if (typeof val1 === 'object' && val1 !== null && typeof val2 === 'string' && val1?.name) {
        return val1.name === val2;
    }
    if (typeof val1 === 'string' && typeof val2 === 'object' && val2?.name) {
        return val1 === val2.name;
    }
    if (typeof val1 !== 'object' || typeof val2 !== 'object' || val1 === null || val2 === null) {
        return val1 === val2;
    }
    if (val1?.reference && val2?.reference) {
        return val1.reference === val2.reference;
    }
    if ('data' in val1 && 'data' in val2) {
        const d1 = val1.data;
        const d2 = val2.data;
        if (typeof d1 === 'object' && d1 !== null && typeof d2 === 'object' && d2 !== null) {
            return JSON.stringify(d1) === JSON.stringify(d2);
        }
        return d1 === d2;
    }
    return JSON.stringify(val1) === JSON.stringify(val2);
};

const VERSION_LABEL_RE = /^(Version\s+\d+)(\s+\((Latest|Original)\))$/;

const renderColorizedVersionLabel = (text: string): React.ReactNode => {
    const match = VERSION_LABEL_RE.exec(text.trim());
    if (!match) return text;
    return (
        <>
            <span className="text-[var(--primary-blue-color)] pointer-events-none">{match[1]}</span>{' '}
            <span className="text-[var(--dark-gray-color)] pointer-events-none">{match[2].trim()}</span>
        </>
    );
};

const ADD_NEW_VALUES = new Set(['__add_new__', '__add_custom__']);

function Select({
    id,
    required,
    options: optionsProp = [],
    value,
    onChange,
    className,
    placeholder = 'Select...',
    label,
    isDisabled,
    placement,
    isMulti = false,
    isClearable,
    isSearchable = false,
    error,
    minWidth,
    dropdownWidth,
    dataTestId,
    colorizeVersionLabel = false,
    showOptionDescriptionInDropdown = false,
}: Props) {
    const nativeSelectRef = useRef<HTMLSelectElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const listboxRef = useRef<HTMLDivElement>(null);

    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);

    // De-duplicate options by their string-keyed value.
    const options = useMemo(() => {
        const map = new Map<string, (typeof optionsProp)[number]>();
        for (const opt of optionsProp) {
            map.set(getOptionValueString(opt.value), opt);
        }
        return Array.from(map.values());
    }, [optionsProp]);

    const hasOptions = options.length > 0;
    const triggerDisabled = !!isDisabled || !hasOptions;
    const hasSearch = isSearchable && !isMulti;

    // Unwrap { value, label } for single-mode value.
    const singleRawValue = useMemo(() => {
        if (isMulti) return undefined;
        const v = value as SingleSelectProps['value'];
        if (v && typeof v === 'object' && 'value' in v) return (v as { value: OptionValue }).value;
        return v as OptionValue | null | undefined;
    }, [isMulti, value]);

    const multiValues = isMulti ? (value as MultiSelectProps['value']) : undefined;

    const hasValue = isMulti
        ? Array.isArray(multiValues) && multiValues.length > 0
        : singleRawValue != null && singleRawValue !== '' && singleRawValue !== placeholder;

    const effectiveClearable = isClearable ?? isMulti;

    // Filter options by search term (single + searchable only).
    const visibleOptions = useMemo(() => {
        if (!hasSearch || !searchTerm) return options;
        const needle = searchTerm.toLowerCase();
        return options.filter((opt) => opt.label.toLowerCase().includes(needle));
    }, [hasSearch, searchTerm, options]);

    // Reset highlight + search when popover opens/closes.
    useEffect(() => {
        if (open) {
            const idx = (() => {
                if (isMulti) return -1;
                const found = visibleOptions.findIndex((opt) => valuesMatch(opt.value, singleRawValue));
                return found;
            })();
            setHighlightedIndex(idx);
        } else {
            setSearchTerm('');
            setHighlightedIndex(-1);
        }
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-focus search when opening.
    useEffect(() => {
        if (open && hasSearch) {
            const id = requestAnimationFrame(() => searchInputRef.current?.focus());
            return () => cancelAnimationFrame(id);
        }
    }, [open, hasSearch]);

    // Keep highlightedIndex in range as visibleOptions shrinks.
    useEffect(() => {
        if (highlightedIndex >= visibleOptions.length) {
            setHighlightedIndex(visibleOptions.length - 1);
        }
    }, [visibleOptions.length, highlightedIndex]);

    const selectSingle = useCallback(
        (optValue: OptionValue) => {
            const matched = options.find((opt) => valuesMatch(opt.value, optValue));
            (onChange as SingleSelectProps['onChange'])(matched ? matched.value : (optValue as any));
            setOpen(false);
        },
        [options, onChange],
    );

    const toggleMulti = useCallback(
        (optValue: OptionValue, optLabel: string) => {
            const current = (multiValues ?? []).slice();
            const idx = current.findIndex((v) => valuesMatch(v.value, optValue));
            let next: { value: string | number; label: string }[];
            if (idx >= 0) {
                next = current.filter((_, i) => i !== idx);
            } else {
                next = [...current, { value: optValue as string | number, label: optLabel }];
            }
            (onChange as MultiSelectProps['onChange'])(next.length > 0 ? next : undefined);
            // multi keeps the popover open.
        },
        [multiValues, onChange],
    );

    const handleOptionActivate = useCallback(
        (opt: (typeof options)[number]) => {
            if (opt.disabled) return;
            if (isMulti) {
                toggleMulti(opt.value, opt.label);
            } else {
                selectSingle(opt.value);
            }
        },
        [isMulti, selectSingle, toggleMulti],
    );

    const onListKeyDown = useCallback(
        (e: ReactKeyboardEvent<HTMLDivElement | HTMLInputElement>) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (visibleOptions.length === 0) return;
                let next = highlightedIndex;
                for (let i = 0; i < visibleOptions.length; i++) {
                    next = (next + 1) % visibleOptions.length;
                    if (!visibleOptions[next].disabled) break;
                }
                setHighlightedIndex(next);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (visibleOptions.length === 0) return;
                let next = highlightedIndex < 0 ? visibleOptions.length : highlightedIndex;
                for (let i = 0; i < visibleOptions.length; i++) {
                    next = (next - 1 + visibleOptions.length) % visibleOptions.length;
                    if (!visibleOptions[next].disabled) break;
                }
                setHighlightedIndex(next);
            } else if (e.key === 'Home') {
                e.preventDefault();
                const idx = visibleOptions.findIndex((o) => !o.disabled);
                setHighlightedIndex(idx);
            } else if (e.key === 'End') {
                e.preventDefault();
                for (let i = visibleOptions.length - 1; i >= 0; i--) {
                    if (!visibleOptions[i].disabled) {
                        setHighlightedIndex(i);
                        return;
                    }
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (highlightedIndex >= 0 && highlightedIndex < visibleOptions.length) {
                    handleOptionActivate(visibleOptions[highlightedIndex]);
                }
            }
        },
        [visibleOptions, highlightedIndex, handleOptionActivate],
    );

    // Build the trigger display node.
    const triggerDisplay = useMemo(() => {
        if (isMulti) {
            if (!multiValues || multiValues.length === 0) {
                return <span className={PLACEHOLDER_CLASSES}>{hasOptions ? placeholder : 'No options'}</span>;
            }
            return (
                <div className="flex flex-wrap items-center gap-y-1 min-w-0 w-full">
                    {multiValues.map((v) => (
                        <div key={getOptionValueString(v.value)} className={CHIP_CLASSES} data-tag-value={getOptionValueString(v.value)}>
                            <span className={CHIP_LABEL_CLASSES} title={v.label}>
                                {v.label}
                            </span>
                            <span
                                role="button"
                                tabIndex={-1}
                                className={CHIP_REMOVE_CLASSES}
                                aria-label={`Remove ${v.label}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleMulti(v.value, v.label);
                                }}
                                onPointerDown={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        toggleMulti(v.value, v.label);
                                    }
                                }}
                            >
                                <X size={12} />
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
        // single
        if (singleRawValue == null || singleRawValue === '') {
            return <span className={PLACEHOLDER_CLASSES}>{hasOptions ? placeholder : 'No options'}</span>;
        }
        const matched = options.find((o) => valuesMatch(o.value, singleRawValue));
        const labelText = matched?.label ?? String(singleRawValue);
        if (colorizeVersionLabel) {
            return <span>{renderColorizedVersionLabel(labelText)}</span>;
        }
        return <span title={labelText}>{labelText}</span>;
    }, [isMulti, multiValues, singleRawValue, options, hasOptions, placeholder, colorizeVersionLabel, toggleMulti]);

    // Build the listbox option nodes.
    const renderOptionLabel = (opt: (typeof options)[number]) => {
        if (showOptionDescriptionInDropdown && opt.description) {
            return (
                <span className={OPTION_LABEL_WRAP_CLASSES} title={`${opt.label} ${opt.description}`}>
                    <span className="block leading-5">{opt.label}</span>
                    <span className="block text-xs text-gray-500 leading-4">{opt.description}</span>
                </span>
            );
        }
        if (colorizeVersionLabel) {
            return <span className={OPTION_LABEL_TRUNCATE_CLASSES}>{renderColorizedVersionLabel(opt.label)}</span>;
        }
        const isAddNew = ADD_NEW_VALUES.has(getOptionValueString(opt.value));
        return (
            <span className={cn(OPTION_LABEL_TRUNCATE_CLASSES, isAddNew && OPTION_ADD_NEW_CLASSES)} title={opt.label}>
                {opt.label}
            </span>
        );
    };

    const isOptionSelected = (opt: (typeof options)[number]): boolean => {
        if (isMulti) {
            return (multiValues ?? []).some((v) => valuesMatch(v.value, opt.value));
        }
        return valuesMatch(opt.value, singleRawValue);
    };

    const triggerClass = isMulti
        ? cn(effectiveClearable && hasValue ? WRAPPER_CLEARABLE_CLASSES : WRAPPER_CLASSES, triggerDisabled && TRIGGER_DISABLED_CLASSES)
        : cn(effectiveClearable && hasValue ? TRIGGER_CLEARABLE_CLASSES : TRIGGER_CLASSES, triggerDisabled && TRIGGER_DISABLED_CLASSES);

    return (
        <div data-testid={dataTestId ?? `select-${id}`}>
            {label && <Label htmlFor={id} title={label} required={required} />}
            <div
                className={cn('relative', className)}
                style={{
                    ...(minWidth ? { minWidth: `${minWidth}px` } : {}),
                    ...(dropdownWidth ? ({ '--select-dropdown-width': `${dropdownWidth}px` } as CSSProperties) : {}),
                }}
            >
                <Popover.Root open={open} onOpenChange={(o) => !triggerDisabled && setOpen(o)}>
                    <Popover.Trigger asChild>
                        <button
                            type="button"
                            id={id}
                            disabled={triggerDisabled}
                            aria-haspopup="listbox"
                            aria-expanded={open}
                            className={triggerClass}
                            data-testid={dataTestId ? `${dataTestId}-trigger` : `select-${id}-trigger`}
                        >
                            {triggerDisplay}
                            <ChevronsUpDown className={CHEVRON_CLASSES} aria-hidden />
                        </button>
                    </Popover.Trigger>

                    <Popover.Portal>
                        <Popover.Content
                            side={placement ?? 'bottom'}
                            align="start"
                            sideOffset={8}
                            collisionPadding={8}
                            className={cn(CONTENT_CLASSES, dropdownWidth ? CONTENT_FIXED_WIDTH_CLASSES : CONTENT_FLUID_WIDTH_CLASSES)}
                            onOpenAutoFocus={(e) => {
                                if (hasSearch) {
                                    e.preventDefault();
                                    requestAnimationFrame(() => searchInputRef.current?.focus());
                                }
                            }}
                            onKeyDown={onListKeyDown}
                            data-testid={dataTestId ? `${dataTestId}-content` : `select-${id}-content`}
                        >
                            {hasSearch && (
                                <div className={SEARCH_WRAPPER_CLASSES}>
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        className={SEARCH_INPUT_CLASSES}
                                        placeholder="Search..."
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            setHighlightedIndex(0);
                                        }}
                                        data-testid={dataTestId ? `${dataTestId}-search` : `select-${id}-search`}
                                    />
                                </div>
                            )}
                            <div ref={listboxRef} role="listbox" aria-multiselectable={isMulti} className={LISTBOX_CLASSES} tabIndex={-1}>
                                {visibleOptions.length === 0 ? (
                                    <div className={NO_OPTIONS_CLASSES}>No options</div>
                                ) : (
                                    visibleOptions.map((opt, idx) => {
                                        const selected = isOptionSelected(opt);
                                        const highlighted = idx === highlightedIndex;
                                        return (
                                            // biome-ignore lint/a11y/useFocusableInteractive: listbox uses active-descendant pattern; keyboard handled on parent
                                            // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard activation handled by onKeyDown on the Popover.Content (onListKeyDown)
                                            <div
                                                key={getOptionValueString(opt.value)}
                                                role="option"
                                                aria-selected={selected}
                                                aria-disabled={opt.disabled || undefined}
                                                className={cn(
                                                    OPTION_CLASSES,
                                                    highlighted && OPTION_HIGHLIGHTED_CLASSES,
                                                    opt.disabled && OPTION_DISABLED_CLASSES,
                                                )}
                                                data-value={getOptionValueString(opt.value)}
                                                onMouseEnter={() => !opt.disabled && setHighlightedIndex(idx)}
                                                onClick={() => handleOptionActivate(opt)}
                                            >
                                                {renderOptionLabel(opt)}
                                                {selected && <Check className={SELECTED_ICON_CLASSES} aria-hidden />}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </Popover.Content>
                    </Popover.Portal>
                </Popover.Root>

                {/* Hidden native <select> mirrors the value for tests that read [data-testid={dataTestId}-input].value */}
                <select
                    ref={nativeSelectRef}
                    multiple={isMulti}
                    aria-hidden
                    tabIndex={-1}
                    className="sr-only"
                    data-testid={dataTestId ? `${dataTestId}-input` : `select-${id}-input`}
                    value={
                        isMulti
                            ? (multiValues ?? []).map((v) => getOptionValueString(v.value))
                            : singleRawValue == null
                              ? ''
                              : getOptionValueString(singleRawValue)
                    }
                    onChange={() => {
                        /* controlled by the popover; native onChange is unused */
                    }}
                    disabled={triggerDisabled}
                >
                    <option value="">Choose</option>
                    {options.map((opt) => (
                        <option key={getOptionValueString(opt.value)} value={getOptionValueString(opt.value)} disabled={opt.disabled}>
                            {opt.label}
                        </option>
                    ))}
                </select>

                {effectiveClearable && hasValue && !triggerDisabled && (
                    <Button
                        id={`${id}-clear`}
                        type="button"
                        variant="transparent"
                        color="lightGray"
                        className="!p-0 absolute top-1/2 end-8 -translate-y-1/2"
                        data-testid={dataTestId ? `${dataTestId}-clear` : `select-${id}-clear`}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (isMulti) {
                                (onChange as MultiSelectProps['onChange'])(undefined);
                            } else {
                                (onChange as SingleSelectProps['onChange'])('');
                            }
                        }}
                        aria-label="Clear selection"
                    >
                        <X size={12} />
                    </Button>
                )}
            </div>
            {error && <div className="text-red-500 mt-1">{error}</div>}
        </div>
    );
}

export default Select;
