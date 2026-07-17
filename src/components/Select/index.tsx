import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
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
    labelTooltip?: string;
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
    showSelectedDescriptionAsHelp?: boolean;
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
    labelTooltip,
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
    showSelectedDescriptionAsHelp = false,
}: Props) {
    const searchInputRef = useRef<HTMLInputElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    // Only switch the popover into modal mode when the trigger lives inside a Radix Dialog.
    // Dialog's react-remove-scroll otherwise cancels wheel events on the portaled dropdown
    // (so you can't scroll the option list). Outside a Dialog we keep modal=false so sibling
    // controls (e.g. an "Add" button next to a multi-select) stay clickable while open.
    const [modal, setModal] = useState(false);

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
    const hasSearch = isSearchable;

    // Unwrap { value, label } for single-mode value.
    const singleRawValue = useMemo(() => {
        if (isMulti) return undefined;
        const v = value;
        if (v && typeof v === 'object' && 'value' in v) return (v as { value: OptionValue }).value;
        return v;
    }, [isMulti, value]);

    const multiValues = isMulti ? (value as MultiSelectProps['value']) : undefined;

    const selectedDescription = useMemo(() => {
        if (isMulti || !showSelectedDescriptionAsHelp || singleRawValue == null || singleRawValue === '') return undefined;
        return optionsProp.find((opt) => valuesMatch(opt.value, singleRawValue))?.description;
    }, [isMulti, showSelectedDescriptionAsHelp, singleRawValue, optionsProp]);

    const hasValue = isMulti
        ? Array.isArray(multiValues) && multiValues.length > 0
        : singleRawValue != null && singleRawValue !== '' && singleRawValue !== placeholder;

    const effectiveClearable = isClearable ?? isMulti;

    // Filter options by search term (searchable only).
    const visibleOptions = useMemo(() => {
        if (!hasSearch || !searchTerm) return options;
        const needle = searchTerm.toLowerCase();
        return options.filter((opt) => opt.label.toLowerCase().includes(needle));
    }, [hasSearch, searchTerm, options]);

    // Force-close popover if the trigger becomes disabled while open
    // (e.g. last option of a multi-select was just chosen — leaving the
    // modal popover open would block clicks on surrounding dialog controls).
    useEffect(() => {
        if (open && triggerDisabled) setOpen(false);
    }, [open, triggerDisabled]);

    // Close on outside pointerdown ourselves. Radix defers its own outside-dismiss to the
    // click event, so opening a modal Dialog on the same click leaves this (non-modal) popover
    // orphaned on top of the dialog — its deferred dismiss gets swallowed by the dialog layer.
    // A capture-phase pointerdown fires before the dialog mounts and reliably closes it.
    useEffect(() => {
        if (!open) return;
        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target as Node | null;
            if (!target) return;
            if (wrapperRef.current?.contains(target) || contentRef.current?.contains(target)) return;
            setOpen(false);
        };
        document.addEventListener('pointerdown', handlePointerDown, true);
        return () => document.removeEventListener('pointerdown', handlePointerDown, true);
    }, [open]);

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
            const frameId = requestAnimationFrame(() => searchInputRef.current?.focus());
            return () => cancelAnimationFrame(frameId);
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

    const findEnabledIndex = useCallback(
        (start: number, step: number) => {
            let next = start;
            // Step through the list at most once, wrapping around, until a non-disabled option is found.
            visibleOptions.some(() => {
                next = (next + step + visibleOptions.length) % visibleOptions.length;
                return !visibleOptions[next].disabled;
            });
            return next;
        },
        [visibleOptions],
    );

    const onListKeyDown = useCallback(
        (e: ReactKeyboardEvent<HTMLDivElement | HTMLInputElement>) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (visibleOptions.length === 0) return;
                setHighlightedIndex(findEnabledIndex(highlightedIndex, 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (visibleOptions.length === 0) return;
                setHighlightedIndex(findEnabledIndex(highlightedIndex < 0 ? visibleOptions.length : highlightedIndex, -1));
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
        [visibleOptions, highlightedIndex, handleOptionActivate, findEnabledIndex],
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
                            <button
                                type="button"
                                tabIndex={-1}
                                className={CHIP_REMOVE_CLASSES}
                                aria-label={`Remove ${v.label}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleMulti(v.value, v.label);
                                }}
                                onPointerDown={(e) => e.stopPropagation()}
                            >
                                <X size={12} />
                            </button>
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
        const labelText = matched?.label ?? getOptionValueString(singleRawValue);
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
                    <span className="block truncate text-xs text-gray-500 leading-4 dark:text-neutral-500">{opt.description}</span>
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

    const clearableActive = effectiveClearable && hasValue;
    const multiBaseClass = clearableActive ? WRAPPER_CLEARABLE_CLASSES : WRAPPER_CLASSES;
    const singleBaseClass = clearableActive ? TRIGGER_CLEARABLE_CLASSES : TRIGGER_CLASSES;
    const triggerClass = cn(isMulti ? multiBaseClass : singleBaseClass, triggerDisabled && TRIGGER_DISABLED_CLASSES);

    const listboxId = `${id}-listbox`;
    const getOptionDomId = (val: OptionValue) => `${id}-option-${getOptionValueString(val)}`;
    const activeOption = highlightedIndex >= 0 && highlightedIndex < visibleOptions.length ? visibleOptions[highlightedIndex] : undefined;
    const activeDescendantId = activeOption ? getOptionDomId(activeOption.value) : undefined;

    // Value mirrored onto the hidden native <select>.
    const nativeSelectValue = (() => {
        if (isMulti) return (multiValues ?? []).map((v) => getOptionValueString(v.value));
        if (singleRawValue == null) return '';
        return getOptionValueString(singleRawValue);
    })();

    return (
        <div data-testid={dataTestId ?? `select-${id}`}>
            {label && <Label htmlFor={id} title={label} required={required} labelTooltip={labelTooltip} />}
            <div ref={wrapperRef} className={cn('relative', className)} style={minWidth ? { minWidth: `${minWidth}px` } : undefined}>
                <Popover.Root
                    modal={modal}
                    open={open}
                    onOpenChange={(o) => {
                        if (o && triggerDisabled) return;
                        if (o) setModal(triggerRef.current?.closest('[role="dialog"]') != null);
                        setOpen(o);
                    }}
                >
                    <Popover.Trigger asChild>
                        <button
                            ref={triggerRef}
                            type="button"
                            disabled={triggerDisabled}
                            aria-haspopup="listbox"
                            aria-expanded={open}
                            aria-controls={open ? listboxId : undefined}
                            className={triggerClass}
                            data-testid={dataTestId ? `${dataTestId}-trigger` : `select-${id}-trigger`}
                        >
                            {triggerDisplay}
                            <ChevronsUpDown className={CHEVRON_CLASSES} aria-hidden />
                        </button>
                    </Popover.Trigger>

                    <Popover.Portal>
                        <Popover.Content
                            ref={contentRef}
                            side={placement ?? 'bottom'}
                            align="start"
                            sideOffset={8}
                            collisionPadding={8}
                            className={cn(CONTENT_CLASSES, !dropdownWidth && CONTENT_FLUID_WIDTH_CLASSES)}
                            style={dropdownWidth ? { width: `${dropdownWidth}px` } : undefined}
                            onOpenAutoFocus={(e) => {
                                if (hasSearch) {
                                    e.preventDefault();
                                    requestAnimationFrame(() => searchInputRef.current?.focus());
                                }
                            }}
                            onKeyDown={onListKeyDown}
                            aria-activedescendant={hasSearch ? undefined : activeDescendantId}
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
                                        role="combobox"
                                        aria-controls={listboxId}
                                        aria-expanded={open}
                                        aria-activedescendant={activeDescendantId}
                                        onChange={(e) => {
                                            const next = e.target.value;
                                            setSearchTerm(next);
                                            const needle = next.toLowerCase();
                                            const filtered = next
                                                ? options.filter((opt) => opt.label.toLowerCase().includes(needle))
                                                : options;
                                            const firstEnabled = filtered.findIndex((o) => !o.disabled);
                                            setHighlightedIndex(firstEnabled);
                                        }}
                                        data-testid={dataTestId ? `${dataTestId}-search` : `select-${id}-search`}
                                    />
                                </div>
                            )}
                            <div // NOSONAR(S6819): custom combobox listbox built on Radix Popover — a native <select> cannot host this aria-activedescendant pattern
                                id={listboxId}
                                role="listbox"
                                aria-multiselectable={isMulti}
                                className={LISTBOX_CLASSES}
                                tabIndex={-1}
                            >
                                {visibleOptions.length === 0 ? (
                                    <div className={NO_OPTIONS_CLASSES}>No options</div>
                                ) : (
                                    visibleOptions.map((opt, idx) => {
                                        const selected = isOptionSelected(opt);
                                        const highlighted = idx === highlightedIndex;
                                        return (
                                            // biome-ignore lint/a11y/useFocusableInteractive: non-tabbable option is correct for active-descendant listbox pattern
                                            // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard activation handled by onKeyDown on Popover.Content (onListKeyDown); aria-activedescendant points here from the focused trigger or search input
                                            <div // NOSONAR(S1082): active-descendant listbox pattern — options never receive focus; keyboard handled on Popover.Content via onListKeyDown
                                                key={getOptionValueString(opt.value)}
                                                id={getOptionDomId(opt.value)}
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

                {/* Hidden native <select> mirrors the value for tests that read [data-testid={dataTestId}-input].value or address it via `select#<id>`. */}
                <select
                    id={id}
                    multiple={isMulti}
                    aria-hidden
                    tabIndex={-1}
                    className="sr-only"
                    data-testid={dataTestId ? `${dataTestId}-input` : `select-${id}-input`}
                    value={nativeSelectValue}
                    onChange={() => {
                        /* controlled by the popover; native onChange is unused */
                    }}
                    onFocus={() => {
                        // Label `htmlFor={id}` points here for API compatibility; forward focus to the visible trigger.
                        triggerRef.current?.focus();
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
            {selectedDescription && (
                <div
                    className="mt-2 rounded-r border-l-4 border-blue-300 bg-blue-50/50 px-3 py-2 text-sm text-[var(--dark-gray-color)] dark:border-blue-400 dark:bg-neutral-800/50 dark:text-neutral-300"
                    data-testid={dataTestId ? `${dataTestId}-selected-description` : `select-${id}-selected-description`}
                >
                    {selectedDescription}
                </div>
            )}
        </div>
    );
}

export default Select;
