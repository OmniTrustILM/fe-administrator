import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { useSelector } from 'react-redux';
import { KeyState, PlatformEnum } from 'types/openapi';

type Props = Readonly<{
    state: KeyState;
}>;

function KeyStateCircle({ state }: Props) {
    const keyStateEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.KeyState));
    const stateText = getEnumLabel(keyStateEnum, state);
    const stateMap: { [key in KeyState]: { color: string; text: string } } = {
        [KeyState.Active]: { color: 'var(--status-success-color)', text: stateText },
        [KeyState.PreActive]: { color: 'var(--status-dark-color)', text: stateText },
        [KeyState.Compromised]: { color: 'var(--status-danger-color)', text: stateText },
        [KeyState.Destroyed]: { color: 'var(--status-danger-color)', text: stateText },
        [KeyState.Deactivated]: { color: 'var(--status-warning-color)', text: stateText },
        [KeyState.DestroyedCompromised]: { color: 'var(--status-danger-color)', text: stateText },
    };

    const _default = { color: 'secondary', text: stateText };

    const { color, text } = state ? stateMap[state] || _default : _default;

    return <span title={text} className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: color }} />;
}

export default KeyStateCircle;
