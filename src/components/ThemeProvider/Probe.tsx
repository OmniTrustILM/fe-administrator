import { useTheme } from './index';

export default function Probe() {
    const { mode, resolvedTheme, setMode, cycleMode } = useTheme();

    return (
        <div>
            <span data-testid="mode">{mode}</span>
            <span data-testid="resolved">{resolvedTheme}</span>
            <button type="button" data-testid="cycle" onClick={cycleMode}>
                cycle
            </button>
            <button type="button" data-testid="set-dark" onClick={() => setMode('dark')}>
                dark
            </button>
        </div>
    );
}
