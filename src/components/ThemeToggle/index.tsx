import Tooltip from 'components/Tooltip';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'components/ThemeProvider';
import { nextMode, type ThemeMode } from 'utils/theme';

const ICONS: Record<ThemeMode, typeof Monitor> = {
    system: Monitor,
    light: Sun,
    dark: Moon,
};

const LABELS: Record<ThemeMode, string> = {
    system: 'System',
    light: 'Light',
    dark: 'Dark',
};

function ThemeToggle() {
    const { mode, cycleMode } = useTheme();

    const Icon = ICONS[mode];
    const current = LABELS[mode];
    const upcoming = LABELS[nextMode(mode)];

    return (
        <Tooltip content={`Theme: ${current}`}>
            <button
                type="button"
                onClick={cycleMode}
                aria-label={`Theme: ${current}. Switch to ${upcoming}.`}
                data-testid="theme-toggle"
                className="p-2 inline-flex items-center rounded-lg text-content-on-brand hover:bg-white/10 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white"
            >
                <Icon size={24} data-theme-icon={mode} aria-hidden="true" />
            </button>
        </Tooltip>
    );
}

export default ThemeToggle;
