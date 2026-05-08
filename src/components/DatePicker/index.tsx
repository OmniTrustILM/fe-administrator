import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import cn from 'classnames';
import { CalendarRange } from 'lucide-react';
import { inputBaseClassName } from 'components/TextInput/inputStyles';
import Button from 'components/Button';
import Container from 'components/Container';

type Props = Readonly<{
    value?: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    disabled?: boolean;
    id?: string;
    invalid?: boolean;
    error?: string;
    className?: string;
    required?: boolean;
    timePicker?: boolean;
}>;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function DatePicker({ value, onChange, onBlur, disabled, id, invalid, error, className, required, timePicker = false }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(value ? new Date(value) : null);
    const [selectedTime, setSelectedTime] = useState<{ hours: number; minutes: number; seconds: number }>(() => {
        if (value && timePicker) {
            const date = new Date(value);
            if (!Number.isNaN(date.getTime())) {
                return {
                    hours: date.getHours(),
                    minutes: date.getMinutes(),
                    seconds: date.getSeconds(),
                };
            }
        }
        return { hours: 0, minutes: 0, seconds: 0 };
    });
    const [currentMonth, setCurrentMonth] = useState(selectedDate ? selectedDate.getMonth() : new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(selectedDate ? selectedDate.getFullYear() : new Date().getFullYear());
    const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const inputValue = useMemo(() => {
        if (!selectedDate) return '';
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const year = selectedDate.getFullYear();
        const dateStr = `${day}.${month}.${year}`;
        if (timePicker) {
            const timeStr = `${String(selectedTime.hours).padStart(2, '0')}:${String(selectedTime.minutes).padStart(2, '0')}:${String(selectedTime.seconds).padStart(2, '0')}`;
            return `${dateStr} ${timeStr}`;
        }
        return dateStr;
    }, [selectedDate, selectedTime, timePicker]);

    useEffect(() => {
        if (value) {
            const date = new Date(value);
            if (!Number.isNaN(date.getTime())) {
                setSelectedDate(date);
                setCurrentMonth(date.getMonth());
                setCurrentYear(date.getFullYear());
                if (timePicker) {
                    setSelectedTime({
                        hours: date.getHours(),
                        minutes: date.getMinutes(),
                        seconds: date.getSeconds(),
                    });
                }
            }
        } else {
            setSelectedDate(null);
            if (timePicker) {
                setSelectedTime({ hours: 0, minutes: 0, seconds: 0 });
            }
        }
    }, [value, timePicker]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            const updateDropdownPosition = () => {
                if (inputRef.current) {
                    const inputRect = inputRef.current.getBoundingClientRect();
                    const dropdownHeight = 380; // Approximate height of the dropdown (w-80 calendar)
                    const dropdownWidth = 320; // w-80 = 20rem = 320px

                    // Position above the input
                    let top = inputRect.top - dropdownHeight - 4; // 4px gap

                    // Ensure the dropdown doesn't go above the viewport
                    if (top < 8) {
                        top = 8; // 8px margin from top
                    }

                    let left = inputRect.left;

                    // Ensure the dropdown doesn't go off the right edge
                    if (left + dropdownWidth > window.innerWidth - 8) {
                        left = window.innerWidth - dropdownWidth - 8; // 8px margin from right
                    }

                    // Ensure dropdown doesn't go off the left edge
                    if (left < 8) {
                        left = 8; // 8px margin from left
                    }

                    setDropdownPosition({ top, left });
                }
            };

            updateDropdownPosition();

            // Update position on scroll and resize
            window.addEventListener('scroll', updateDropdownPosition, true);
            window.addEventListener('resize', updateDropdownPosition);

            return () => {
                window.removeEventListener('scroll', updateDropdownPosition, true);
                window.removeEventListener('resize', updateDropdownPosition);
            };
        } else {
            setDropdownPosition(null);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const clickedInput = containerRef.current?.contains(target);
            const clickedDropdown = dropdownRef.current?.contains(target);
            if (!clickedInput && !clickedDropdown) {
                setIsOpen(false);
                if (onBlur) {
                    onBlur();
                }
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onBlur]);

    const getDaysInMonth = (month: number, year: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (month: number, year: number) => {
        const firstDay = new Date(year, month, 1).getDay();
        // Convert Sunday (0) to 6, Monday (1) to 0, etc.
        return firstDay === 0 ? 6 : firstDay - 1;
    };

    const handleDateSelect = (day: number) => {
        const newDate = new Date(currentYear, currentMonth, day);
        if (timePicker) {
            newDate.setHours(selectedTime.hours, selectedTime.minutes, selectedTime.seconds);
        }
        setSelectedDate(newDate);
        const year = newDate.getFullYear();
        const month = String(newDate.getMonth() + 1).padStart(2, '0');
        const dayStr = String(newDate.getDate()).padStart(2, '0');
        let formattedDate = `${year}-${month}-${dayStr}`;
        if (timePicker) {
            const timeStr = `${String(selectedTime.hours).padStart(2, '0')}:${String(selectedTime.minutes).padStart(2, '0')}:${String(selectedTime.seconds).padStart(2, '0')}`;
            formattedDate = `${formattedDate}T${timeStr}`;
        }
        onChange(formattedDate);
        if (!timePicker) {
            setIsOpen(false);
            if (onBlur) {
                onBlur();
            }
        }
    };

    const handleTimeChange = (type: 'hours' | 'minutes' | 'seconds', value: number) => {
        const newTime = { ...selectedTime, [type]: value };
        setSelectedTime(newTime);
        if (selectedDate) {
            const newDate = new Date(selectedDate);
            newDate.setHours(newTime.hours, newTime.minutes, newTime.seconds);
            setSelectedDate(newDate);
            const year = newDate.getFullYear();
            const month = String(newDate.getMonth() + 1).padStart(2, '0');
            const dayStr = String(newDate.getDate()).padStart(2, '0');
            const timeStr = `${String(newTime.hours).padStart(2, '0')}:${String(newTime.minutes).padStart(2, '0')}:${String(newTime.seconds).padStart(2, '0')}`;
            const formattedDate = `${year}-${month}-${dayStr}T${timeStr}`;
            onChange(formattedDate);
        }
    };

    const handleConfirm = () => {
        setIsOpen(false);
        if (onBlur) {
            onBlur();
        }
    };

    const handlePrevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };

    const handleNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };

    const renderCalendarDays = () => {
        const daysInMonth = getDaysInMonth(currentMonth, currentYear);
        const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
        const days: Array<{ day: number; isCurrentMonth: boolean; isPrevMonth?: boolean; isNextMonth?: boolean }> = [];

        // Get previous month's last days
        const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        const daysInPrevMonth = getDaysInMonth(prevMonth, prevYear);

        // Add days from the previous month
        for (let i = firstDay - 1; i >= 0; i--) {
            days.push({ day: daysInPrevMonth - i, isCurrentMonth: false, isPrevMonth: true });
        }

        // Add days of the current month
        for (let day = 1; day <= daysInMonth; day++) {
            days.push({ day, isCurrentMonth: true });
        }

        // Add days from next month to fill the grid
        const remainingCells = 42 - days.length; // 6 rows * 7 days = 42
        for (let day = 1; day <= remainingCells; day++) {
            days.push({ day, isCurrentMonth: false, isNextMonth: true });
        }

        const rows: Array<{ day: number; isCurrentMonth: boolean; isPrevMonth?: boolean; isNextMonth?: boolean }>[] = [];
        for (let i = 0; i < days.length; i += 7) {
            rows.push(days.slice(i, i + 7));
        }

        return rows;
    };

    const isSelectedDate = (day: number, isCurrentMonth: boolean) => {
        if (!isCurrentMonth || !selectedDate) return false;
        return selectedDate.getDate() === day && selectedDate.getMonth() === currentMonth && selectedDate.getFullYear() === currentYear;
    };

    const calendarRows = renderCalendarDays();

    return (
        <div ref={containerRef} className={cn('relative', className)}>
            <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <CalendarRange size={16} className="text-gray-400 dark:text-neutral-500" />
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    readOnly
                    value={inputValue}
                    disabled={disabled}
                    required={required}
                    id={id}
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    placeholder={timePicker ? 'dd.mm.yyyy 00:00:00' : 'dd.mm.yyyy'}
                    className={cn(
                        inputBaseClassName,
                        'pl-10 cursor-pointer',
                        {
                            'border-red-500 focus:border-red-500 focus:ring-red-500': invalid,
                        },
                        {
                            'bg-[#F8FAFC]': disabled,
                            'bg-white dark:bg-neutral-900': !disabled,
                        },
                    )}
                />
            </div>
            {isOpen &&
                !disabled &&
                dropdownPosition &&
                createPortal(
                    <div
                        ref={dropdownRef}
                        className="fixed z-[9999] w-80 flex flex-col bg-white border border-gray-200 shadow-lg rounded-xl overflow-hidden dark:bg-neutral-900 dark:border-neutral-700"
                        style={{
                            top: `${dropdownPosition.top}px`,
                            left: `${dropdownPosition.left}px`,
                        }}
                    >
                        <div className="p-3 space-y-0.5">
                            {/* Month/Year Navigation */}
                            <div className="grid grid-cols-5 items-center gap-x-3 mx-1.5 pb-3">
                                {/* Prev Button */}
                                <div className="col-span-1">
                                    <button
                                        type="button"
                                        className="size-8 flex justify-center items-center text-[var(--dark-gray-color)] hover:bg-gray-100 rounded-full disabled:opacity-50 disabled:pointer-events-none focus:outline-hidden focus:bg-gray-100 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:focus:bg-neutral-800"
                                        aria-label="Previous"
                                        onClick={handlePrevMonth}
                                    >
                                        <svg
                                            className="shrink-0 size-4"
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="24"
                                            height="24"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <path d="m15 18-6-6 6-6" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Month / Year */}
                                <div className="col-span-3 flex justify-center items-center gap-x-1">
                                    <span className="text-sm font-medium text-[var(--dark-gray-color)] dark:text-neutral-200">
                                        {MONTHS[currentMonth]}
                                    </span>
                                    <span className="text-[var(--dark-gray-color)] dark:text-neutral-200">/</span>
                                    <span className="text-sm font-medium text-[var(--dark-gray-color)] dark:text-neutral-200">
                                        {currentYear}
                                    </span>
                                </div>

                                {/* Next Button */}
                                <div className="col-span-1 flex justify-end">
                                    <button
                                        type="button"
                                        className="size-8 flex justify-center items-center text-[var(--dark-gray-color)] hover:bg-gray-100 rounded-full disabled:opacity-50 disabled:pointer-events-none focus:outline-hidden focus:bg-gray-100 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:focus:bg-neutral-800"
                                        aria-label="Next"
                                        onClick={handleNextMonth}
                                    >
                                        <svg
                                            className="shrink-0 size-4"
                                            width="24"
                                            height="24"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <path d="m9 18 6-6-6-6" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Weekday Headers */}
                            <div className="flex pb-1.5">
                                {WEEKDAYS.map((day) => (
                                    <span
                                        key={day}
                                        className="m-px w-10 block text-center text-sm text-[var(--dark-gray-color)] dark:text-neutral-500"
                                    >
                                        {day}
                                    </span>
                                ))}
                            </div>

                            {/* Calendar Days */}
                            {calendarRows.map((row, rowIndex) => (
                                <div key={`week-${row[0].day}-${row[6].day}`} className="flex">
                                    {row.map((dayInfo, dayIndex) => {
                                        const { day, isCurrentMonth } = dayInfo;
                                        const isSelected = isSelectedDate(day, isCurrentMonth);

                                        return (
                                            <div key={`${rowIndex}-${dayIndex}`}>
                                                <button
                                                    type="button"
                                                    className={cn(
                                                        'm-px size-10 flex justify-center items-center border-[1.5px] border-transparent text-sm rounded-full disabled:opacity-50 disabled:pointer-events-none focus:outline-hidden',
                                                        {
                                                            'bg-blue-600 border-transparent text-white font-medium hover:border-blue-600 dark:bg-blue-500':
                                                                isSelected,
                                                            'text-[var(--dark-gray-color)] hover:border-blue-600 hover:text-blue-600 focus:border-blue-600 focus:text-blue-600 dark:text-neutral-200 dark:hover:border-blue-500 dark:hover:text-blue-500 dark:focus:border-blue-500 dark:focus:text-blue-500':
                                                                !isSelected && isCurrentMonth,
                                                            'text-[var(--dark-gray-color)] hover:border-blue-600 hover:text-blue-600 rounded-full disabled:opacity-50 disabled:pointer-events-none focus:outline-hidden focus:bg-gray-100 dark:text-neutral-200 dark:hover:border-neutral-500 dark:focus:bg-neutral-700':
                                                                !isCurrentMonth,
                                                        },
                                                    )}
                                                    onClick={() => isCurrentMonth && handleDateSelect(day)}
                                                    disabled={!isCurrentMonth}
                                                >
                                                    {day}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>

                        {/* Time Picker */}
                        {timePicker && (
                            <div className="border-t border-gray-200 dark:border-neutral-700 p-3">
                                <div className="flex items-center justify-center gap-2">
                                    <label
                                        htmlFor="datepicker-time-hours"
                                        className="text-sm font-medium text-[var(--dark-gray-color)] dark:text-neutral-300"
                                    >
                                        Time:
                                    </label>
                                    <div className="flex items-center gap-1">
                                        <input
                                            id="datepicker-time-hours"
                                            type="number"
                                            min="0"
                                            max="23"
                                            value={selectedTime.hours}
                                            onChange={(e) => {
                                                const val = Number.parseInt(e.target.value, 10) || 0;
                                                handleTimeChange('hours', Math.max(0, Math.min(23, val)));
                                            }}
                                            className="w-12 px-2 py-1 text-sm border border-gray-300 rounded-md text-center focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                        <span className="text-[var(--dark-gray-color)] dark:text-neutral-400">:</span>
                                        <input
                                            type="number"
                                            min="0"
                                            max="59"
                                            value={selectedTime.minutes}
                                            onChange={(e) => {
                                                const val = Number.parseInt(e.target.value, 10) || 0;
                                                handleTimeChange('minutes', Math.max(0, Math.min(59, val)));
                                            }}
                                            className="w-12 px-2 py-1 text-sm border border-gray-300 rounded-md text-center focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                        <span className="text-[var(--dark-gray-color)] dark:text-neutral-400">:</span>
                                        <input
                                            type="number"
                                            min="0"
                                            max="59"
                                            value={selectedTime.seconds}
                                            onChange={(e) => {
                                                const val = Number.parseInt(e.target.value, 10) || 0;
                                                handleTimeChange('seconds', Math.max(0, Math.min(59, val)));
                                            }}
                                            className="w-12 px-2 py-1 text-sm border border-gray-300 rounded-md text-center focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                    </div>
                                </div>
                                <Container className="flex-row justify-end pt-4" gap={2}>
                                    <Button variant="outline" color="primary" className="!py-2 !px-3" onClick={() => setIsOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button variant="solid" color="primary" className="!py-2 !px-3" onClick={handleConfirm}>
                                        Confirm
                                    </Button>
                                </Container>
                            </div>
                        )}
                    </div>,
                    document.body,
                )}
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
    );
}

export default DatePicker;
