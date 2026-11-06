import { useSelector } from 'react-redux';
import { selectors } from 'ducks/user-interface';
import type { LockWidgetNameEnum } from 'types/user-interface';

export function useWidgetLock(widgetLockName: LockWidgetNameEnum | LockWidgetNameEnum[] | undefined) {
    const widgetLocks = useSelector(selectors.selectWidgetLocks) || [];
    return widgetLocks.find(
        (lock) => lock.widgetName === widgetLockName || (Array.isArray(widgetLockName) && widgetLockName.includes(lock.widgetName)),
    );
}
