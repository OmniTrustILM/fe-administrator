import { useDispatch, useSelector } from 'react-redux';

import { actions, selectors } from 'ducks/alerts';

import Alert from './Alert';
import { DISMISS_ALL_THRESHOLD } from './constants';

type Props = {
    autoDismissMs?: number;
};

function Alerts({ autoDismissMs }: Readonly<Props>) {
    const alerts = useSelector(selectors.selectMessages);
    const dispatch = useDispatch();

    return (
        <div
            data-testid="alerts-container"
            className="pointer-events-none fixed bottom-4 right-4 z-[9999] flex max-h-[calc(100vh-2rem)] w-[min(420px,calc(100vw-2rem))] flex-col gap-2"
        >
            {alerts.length >= DISMISS_ALL_THRESHOLD && (
                <button
                    type="button"
                    className="pointer-events-auto self-end rounded-md px-2 py-1 text-xs font-medium text-gray-800 hover:text-gray-900 dark:text-neutral-400 dark:hover:text-neutral-200"
                    onClick={() => dispatch(actions.dismissAll())}
                >
                    Dismiss all
                </button>
            )}
            <div
                data-testid="alerts-scroll-area"
                aria-live="polite"
                // Newest alerts render first in the DOM; column-reverse places them at the visual
                // bottom and keeps the scroll position anchored there, so a new alert is always visible
                // even when persistent errors overflow the stack. The x-axis is clipped because the
                // toast-in animation slides cards in from the right and would otherwise flash a
                // horizontal scrollbar for the duration of the animation.
                className="flex min-h-0 flex-col-reverse gap-2 overflow-x-hidden overflow-y-auto"
            >
                {[...alerts].reverse().map((alert) => (
                    <Alert key={alert.id} alert={alert} autoDismissMs={autoDismissMs} />
                ))}
            </div>
        </div>
    );
}

export default Alerts;
