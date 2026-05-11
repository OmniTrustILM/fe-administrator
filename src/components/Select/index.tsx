import { type CSSProperties, useEffect, useMemo, useRef } from 'react';
import Label from 'components/Label';
import Button from 'components/Button';
import cn from 'classnames';
import {
    SELECT_WRAPPER_CLASSES,
    SELECT_WRAPPER_CLEARABLE_CLASSES,
    SELECT_TAGS_INPUT_CLASSES,
    SELECT_TAGS_ITEM_TEMPLATE,
    SELECT_SEARCH_CLASSES,
    SELECT_SEARCH_WRAPPER_CLASSES,
    SELECT_TOGGLE_CLASSES_BASE,
    SELECT_DROPDOWN_CLASSES_BASE,
    SELECT_DROPDOWN_FIXED_WIDTH_CLASSES,
    SELECT_OPTION_CLASSES,
    SELECT_OPTION_TEMPLATE,
    SELECT_EXTRA_MARKUP,
} from './classes';
import { X } from 'lucide-react';

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

const getOptionValueString = (val: OptionValue): string => {
    if (typeof val === 'object' && val !== null) {
        if ('reference' in val && typeof val.reference === 'string') {
            return val.reference;
        }
        const uuid = getUuidFromValue(val);
        if (uuid) {
            return uuid;
        }
        if ('data' in val && val.data !== undefined) {
            const d = val.data;
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

/**
 * Syncs the native <select> element's value/selected state to match the React prop.
 * Must be called after HSSelect.destroy() and before HSSelect.autoInit() so that
 * the re-initialized widget reads the correct selection from the DOM.
 */
const syncNativeSelectionSingle = (selectEl: HTMLSelectElement, valueFromProp: OptionValue | undefined): void => {
    selectEl.value = valueFromProp == null ? '' : getOptionValueString(valueFromProp);
};

const syncNativeSelectionMulti = (selectEl: HTMLSelectElement, values: { value: string | number; label: string }[] | undefined): void => {
    const selectedValueStrings = new Set((values ?? []).map((v) => getOptionValueString(v.value)));
    Array.from(selectEl.options).forEach((option) => {
        if (option.value === '') {
            option.selected = false;
            return;
        }
        option.selected = selectedValueStrings.has(option.value);
    });
};

type Props = SingleSelectProps | MultiSelectProps;

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
    dropdownScope,
    dropdownWidth,
    dataTestId,
    colorizeVersionLabel = false,
    showOptionDescriptionInDropdown = false,
}: Props) {
    const selectRef = useRef<HTMLSelectElement>(null);
    const previousOptionsRef = useRef<string>('');
    const previousValueRef = useRef<
        | string
        | number
        | object
        | { value: string | number | object; label: string }
        | { value: string | number; label: string }[]
        | null
        | undefined
    >(undefined);
    const isInitializedRef = useRef(false);

    const getValueFromProp = useMemo(() => {
        if (isMulti) {
            return undefined; // Multi-select doesn't need this
        }
        const singleValue = value;
        if (singleValue && typeof singleValue === 'object' && 'value' in singleValue) {
            return singleValue.value;
        }
        return singleValue as string | number | object | undefined;
    }, [isMulti, value]);

    // Remove duplicate options
    const options = useMemo(() => {
        return Array.from(new Map(optionsProp.map((o) => [o.value, o])).values());
    }, [optionsProp]);

    const optionsKey = useMemo(() => {
        return JSON.stringify(options?.map((opt) => ({ value: opt.value, label: opt.label, disabled: opt.disabled })));
    }, [options]);

    useEffect(() => {
        if (!selectRef.current || !(globalThis as any).HSSelect) return;

        const optionsChanged = previousOptionsRef.current !== optionsKey;
        const valueChanged = (() => {
            if (isMulti) {
                const prev = previousValueRef.current as { value: string | number; label: string }[] | undefined;
                const curr = value as { value: string | number; label: string }[];
                if (!prev && !curr) return false;
                if (!prev || !curr) return true;
                if (prev.length !== curr.length) return true;
                return prev.some((p, i) => !valuesMatch(p.value, curr[i]?.value));
            } else {
                return !valuesMatch(previousValueRef.current, getValueFromProp);
            }
        })();

        const scheduleAutoInit = () => {
            const frameId = requestAnimationFrame(() => {
                if (selectRef.current && (globalThis as any).HSSelect) {
                    (globalThis as any).HSSelect.autoInit();
                    isInitializedRef.current = true;
                }
            });
            return () => cancelAnimationFrame(frameId);
        };

        const destroyAndResync = (closeIfOpen: boolean) => {
            const instance = (globalThis as any).HSSelect.getInstance(selectRef.current);
            if (instance) {
                if (closeIfOpen && typeof instance.isOpened === 'function' && instance.isOpened()) {
                    instance.close();
                }
                instance.destroy();
                isInitializedRef.current = false;
            }
            if (selectRef.current) {
                if (isMulti) {
                    syncNativeSelectionMulti(selectRef.current, value as { value: string | number; label: string }[] | undefined);
                } else {
                    syncNativeSelectionSingle(selectRef.current, getValueFromProp);
                }
            }
        };

        if (optionsChanged) {
            destroyAndResync(false);
            const cleanup = scheduleAutoInit();
            previousOptionsRef.current = optionsKey;
            previousValueRef.current = value;
            return cleanup;
        } else if (valueChanged) {
            destroyAndResync(true);
            const cleanup = scheduleAutoInit();
            previousValueRef.current = value;
            return cleanup;
        } else if (isInitializedRef.current) {
            previousValueRef.current = value;
        } else {
            const cleanup = scheduleAutoInit();
            previousValueRef.current = value;
            return cleanup;
        }
    }, [optionsKey, value, isMulti, getValueFromProp]);

    useEffect(() => {
        const select = selectRef.current;
        if (!select?.parentNode) return;

        const escapeHtml = (text: string) =>
            text
                .replaceAll('&', '&amp;')
                .replaceAll('<', '&lt;')
                .replaceAll('>', '&gt;')
                .replaceAll('"', '&quot;')
                .replaceAll("'", '&#039;');

        const applyVersionLabelColor = (root: Element) => {
            if (!colorizeVersionLabel) return;

            const applyTextColorMarkup = (element: HTMLElement) => {
                const text = element.textContent?.trim();
                if (!text) return;

                const match = /^(Version\s+\d+)(\s+\((Latest|Original)\))$/.exec(text);
                if (!match) return;

                const versionPart = escapeHtml(match[1]);
                const suffixPart = escapeHtml(match[2].trim());

                element.innerHTML = `<span class="text-[var(--primary-blue-color)] pointer-events-none">${versionPart}</span> <span class="text-[var(--dark-gray-color)] pointer-events-none">${suffixPart}</span>`;
            };

            const toggleButton = root.querySelector?.('button[aria-expanded]');
            if (toggleButton instanceof HTMLElement) {
                toggleButton.querySelectorAll?.('span').forEach((spanEl) => {
                    if (!(spanEl instanceof HTMLElement)) return;
                    applyTextColorMarkup(spanEl);
                });
            }
        };

        const applyDropdownOptionDescriptions = (dropdown: Element | null) => {
            if (!showOptionDescriptionInDropdown || !dropdown) return;

            dropdown.querySelectorAll?.('.hs-select-option-row').forEach((row) => {
                const titleEl = row.querySelector?.('[data-title]');
                if (!(titleEl instanceof HTMLElement)) return;

                const titleText = titleEl.textContent?.trim();
                if (!titleText) return;

                const option = options.find((opt) => opt.label.trim() === titleText);
                const description = option?.description?.trim();
                if (!description) return;

                titleEl.classList.remove('truncate');
                titleEl.classList.add('whitespace-normal');
                titleEl.innerHTML = `<span class="block leading-5">${escapeHtml(titleText)}</span><span class="block text-xs text-gray-500 leading-4">${escapeHtml(description)}</span>`;
            });
        };

        const applyAddNewStyling = (dropdown: Element | null) => {
            dropdown
                ?.querySelectorAll?.('.hs-select-option-row[data-value="__add_new__"], .hs-select-option-row[data-value="__add_custom__"]')
                .forEach((row) => {
                    const titleEl = row.querySelector?.('[data-title]');
                    if (!(titleEl instanceof HTMLElement)) return;
                    const text = titleEl.textContent?.trim();
                    if (text === '+ Add new' || text === '+ Add custom') {
                        titleEl.classList.add('text-blue-600', 'dark:text-blue-400', 'font-medium');
                    }
                });
        };

        const setTitlesAndTooltips = () => {
            const container = select.closest('[data-testid]')?.parentElement ?? select.parentNode;
            const root = container as Element;

            applyVersionLabelColor(root);

            // Try to get dropdown from (globalThis as any).HSSelect instance (works also when dropdownScope === 'window')
            const hsInstance = (globalThis as any).HSSelect?.getInstance?.(select);
            const dropdown: Element | null = hsInstance?.dropdown ?? root.querySelector?.('.hs-select-dropdown');
            applyAddNewStyling(dropdown);
            applyDropdownOptionDescriptions(dropdown);

            dropdown?.querySelectorAll?.('.hs-select-option-row').forEach((row) => {
                const titleEl = row.querySelector?.('[data-title]');
                const tooltipContentEl = row.querySelector?.('[data-tooltip-content]');
                if (titleEl instanceof HTMLElement && tooltipContentEl instanceof HTMLElement && titleEl.textContent) {
                    const titleText = titleEl.querySelector('span')?.textContent?.trim() || titleEl.textContent.trim();
                    const option = options.find((opt) => opt.label.trim() === titleText);
                    const description = option?.description?.trim();
                    const newContent = description ? `${titleText} ${description}` : titleText;
                    if (tooltipContentEl.textContent !== newContent) {
                        tooltipContentEl.textContent = newContent;
                    }
                }
            });
            root.querySelectorAll?.('[data-tag-value]').forEach((tagEl) => {
                const titleEl = tagEl.querySelector?.('[data-title]');
                const tooltipContentEl = tagEl.querySelector?.('[data-tooltip-content]');
                if (titleEl instanceof HTMLElement && tooltipContentEl instanceof HTMLElement && titleEl.textContent) {
                    const newContent = titleEl.textContent.trim();
                    if (tooltipContentEl.textContent !== newContent) {
                        tooltipContentEl.textContent = newContent;
                    }
                }
            });
            (globalThis as any).HSTooltip?.autoInit?.();
        };

        const observer = new MutationObserver(() => {
            observer.disconnect();
            requestAnimationFrame(() => {
                setTitlesAndTooltips();
                if (select?.parentNode) {
                    observer.observe(select.parentNode, { childList: true, subtree: true });
                }
            });
        });
        observer.observe(select.parentNode, { childList: true, subtree: true });
        requestAnimationFrame(() => setTitlesAndTooltips());
        return () => observer.disconnect();
    }, [options, colorizeVersionLabel, showOptionDescriptionInDropdown]);

    const hasOptions = options && options.length > 0;

    const hasSearch = isSearchable && !isMulti;

    // Check if there's a selected value for a clear button
    const hasValue = isMulti
        ? Array.isArray(value) && value.length > 0
        : getValueFromProp != null && getValueFromProp !== '' && getValueFromProp !== placeholder;

    const effectiveClearable = isClearable ?? isMulti;
    const multiSelectWrapperClasses = isMulti && effectiveClearable && hasValue ? SELECT_WRAPPER_CLEARABLE_CLASSES : SELECT_WRAPPER_CLASSES;

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
                <select
                    ref={selectRef}
                    multiple={isMulti}
                    data-testid={dataTestId ? `${dataTestId}-input` : `select-${id}-input`}
                    value={
                        isMulti
                            ? undefined
                            : (() => {
                                  if (getValueFromProp == null) return '';
                                  return getOptionValueString(getValueFromProp);
                              })()
                    }
                    data-hs-select={JSON.stringify({
                        ...(isMulti && {
                            mode: 'tags',
                            wrapperClasses: multiSelectWrapperClasses,
                            tagsInputClasses: SELECT_TAGS_INPUT_CLASSES,
                            tagsItemTemplate: SELECT_TAGS_ITEM_TEMPLATE,
                        }),
                        hasSearch: hasSearch,
                        searchPlaceholder: 'Search...',
                        searchClasses: SELECT_SEARCH_CLASSES,
                        searchWrapperClasses: SELECT_SEARCH_WRAPPER_CLASSES,
                        placeholder: hasOptions ? placeholder : 'No options',
                        toggleTag: '<button type="button" aria-expanded="false"></button>',
                        toggleClasses: `${!isMulti && isClearable && hasValue ? 'pe-14' : 'pe-9'} ${SELECT_TOGGLE_CLASSES_BASE}`,
                        dropdownClasses: `${SELECT_DROPDOWN_CLASSES_BASE} ${
                            dropdownWidth ? SELECT_DROPDOWN_FIXED_WIDTH_CLASSES : 'w-full'
                        } ${hasSearch ? 'px-1 pb-1' : 'p-1'}`,
                        ...(dropdownScope && { dropdownScope }),
                        optionClasses: SELECT_OPTION_CLASSES,
                        optionTemplate: SELECT_OPTION_TEMPLATE,
                        extraMarkup: SELECT_EXTRA_MARKUP,
                        closeOnSelect: !isMulti,
                        dropdownVerticalFixedPlacement: placement,
                    })}
                    id={id}
                    disabled={isDisabled || !hasOptions}
                    className={className}
                    onChange={(e) => {
                        if (isMulti) {
                            const selectedOptions = Array.from(e.target.selectedOptions);
                            const newValues = selectedOptions
                                .map((option) => {
                                    const matchedOption = (options || []).find((opt) => getOptionValueString(opt.value) === option.value);
                                    return matchedOption ? { value: matchedOption.value, label: matchedOption.label } : null;
                                })
                                .filter((val) => val !== null) as { value: string | number; label: string }[]; // Filter out null values and placeholder
                            const result = newValues.length > 0 ? newValues : undefined;
                            (onChange as MultiSelectProps['onChange'])(result);
                        } else {
                            const selectedValue = e.target.value;
                            if (selectedValue === '') {
                                (onChange as SingleSelectProps['onChange'])('');
                                return;
                            }
                            const matchedOption = (options || []).find((opt) => getOptionValueString(opt.value) === selectedValue);
                            (onChange as SingleSelectProps['onChange'])(matchedOption ? matchedOption.value : (selectedValue as any));
                        }
                    }}
                >
                    <option value="">Choose</option>
                    {(options || []).map((option, index) => {
                        const optionValueString = getOptionValueString(option.value);
                        const isSelected = isMulti
                            ? !!value &&
                              (value as { value: string | number; label: string }[]).some((v) => {
                                  return valuesMatch(v.value, option.value);
                              })
                            : valuesMatch(option.value, getValueFromProp);
                        return (
                            <option
                                key={optionValueString || index}
                                value={optionValueString}
                                selected={isSelected}
                                disabled={option.disabled}
                                title={option.label}
                            >
                                {option.label}
                            </option>
                        );
                    })}
                </select>
                {effectiveClearable && hasValue && (
                    <Button
                        id={`${id}-clear`}
                        type="button"
                        variant="transparent"
                        color="lightGray"
                        className="!p-0 absolute top-1/2 end-8 -translate-y-1/2"
                        data-testid={dataTestId ? `${dataTestId}-clear` : `select-${id}-clear`}
                        onClick={() => {
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
