import { useTheme } from './index';
import { THEME_MODES } from 'utils/theme';

export default function Probe() {
    const { mode, resolvedTheme, setMode, cycleMode } = useTheme();

    return (
        <div>
            <span data-testid="mode">{mode}</span>
            <span data-testid="resolved">{resolvedTheme}</span>
            <button type="button" data-testid="cycle" onClick={cycleMode}>
                cycle
            </button>
            {THEME_MODES.map((option) => (
                <button key={option} type="button" data-testid={`set-${option}`} onClick={() => setMode(option)}>
                    {option}
                </button>
            ))}
        </div>
    );
}
