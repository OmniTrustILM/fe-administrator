import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Check, Moon, MoonStar, Sun, SunMedium } from 'lucide-react';
import Dropdown from 'components/Dropdown';
import { useTheme } from 'components/ThemeProvider';
import { isThemeMode, type ThemeMode } from 'utils/theme';

const ICONS: Record<ThemeMode, typeof Sun> = {
    light: Sun,
    dark: Moon,
    systemLight: SunMedium,
    systemDark: MoonStar,
};

const LABELS: Record<ThemeMode, string> = {
    light: 'Light',
    dark: 'Dark',
    systemLight: 'System Light',
    systemDark: 'System Dark',
};

function ThemeToggle() {
    const { mode, setMode, modes } = useTheme();

    const Icon = ICONS[mode];

    return (
        <div data-testid="theme-toggle">
            <Dropdown
                title={<Icon size={24} data-theme-icon={mode} aria-hidden="true" />}
                ariaLabel={`Theme: ${LABELS[mode]}`}
                btnStyle="transparent"
                hideArrow
                className="text-content-on-brand"
                menuClassName="min-w-48"
                menu={
                    <DropdownMenu.RadioGroup
                        value={mode}
                        onValueChange={(value) => {
                            if (isThemeMode(value)) {
                                setMode(value);
                            }
                        }}
                    >
                        {modes.map((option) => {
                            const OptionIcon = ICONS[option];

                            return (
                                <DropdownMenu.RadioItem
                                    key={option}
                                    value={option}
                                    data-testid={`theme-option-${option}`}
                                    className="flex items-center gap-x-3 py-2 px-3 w-full text-left rounded-lg text-sm text-content hover:bg-surface-hover focus:outline-hidden focus:bg-surface-hover cursor-pointer"
                                >
                                    <OptionIcon size={16} aria-hidden="true" />
                                    <span className="grow">{LABELS[option]}</span>
                                    <DropdownMenu.ItemIndicator>
                                        <Check size={16} className="text-brand" aria-hidden="true" />
                                    </DropdownMenu.ItemIndicator>
                                </DropdownMenu.RadioItem>
                            );
                        })}
                    </DropdownMenu.RadioGroup>
                }
            />
        </div>
    );
}

export default ThemeToggle;
