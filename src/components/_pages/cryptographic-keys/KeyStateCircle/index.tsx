import cn from 'classnames';
import Tooltip from 'components/Tooltip';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { useSelector } from 'react-redux';
import { KeyState, PlatformEnum } from 'types/openapi';

type Props = Readonly<{
    state: KeyState;
}>;

function KeyStateCircle({ state }: Props) {
    const keyStateEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.KeyState));
    const stateText = getEnumLabel(keyStateEnum, state);
    const stateMap: { [key in KeyState]: { colorClass: string; text: string } } = {
        [KeyState.Active]: { colorClass: 'bg-success-solid', text: stateText },
        [KeyState.PreActive]: { colorClass: 'bg-surface-inverse', text: stateText },
        [KeyState.Compromised]: { colorClass: 'bg-danger-solid', text: stateText },
        [KeyState.Destroyed]: { colorClass: 'bg-danger-solid', text: stateText },
        [KeyState.Deactivated]: { colorClass: 'bg-warning-solid', text: stateText },
        [KeyState.DestroyedCompromised]: { colorClass: 'bg-danger-solid', text: stateText },
    };

    const _default = { colorClass: 'bg-content-subtle', text: stateText };

    const { colorClass, text } = state ? stateMap[state] || _default : _default;

    return (
        <Tooltip content={text}>
            <span className={cn('w-3 h-3 rounded-full inline-block', colorClass)}>
                <span className="sr-only">{text}</span>
            </span>
        </Tooltip>
    );
}

export default KeyStateCircle;
