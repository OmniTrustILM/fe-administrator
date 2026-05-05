import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { useSelector } from 'react-redux';
import Badge from 'components/Badge';
import { KeyState, PlatformEnum } from 'types/openapi';

type Props = Readonly<{
    state: KeyState;
}>;

function KeyStateBadge({ state }: Props) {
    const keyStateEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.KeyState));
    const text = getEnumLabel(keyStateEnum, state);
    switch (state) {
        case KeyState.Active:
            return <Badge color="success">{text}</Badge>;

        case KeyState.PreActive:
            return <Badge color="warning">{text}</Badge>;

        case KeyState.Compromised:
        case KeyState.Destroyed:
        case KeyState.DestroyedCompromised:
            return <Badge color="danger">{text}</Badge>;

        default:
            return <Badge color="secondary">{text}</Badge>;
    }
}

export default KeyStateBadge;
