import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { actions, selectors } from 'ducks/alerts';
import { sanitizeAlertMessage } from 'utils/alertMessage';

import Alert from './Alert';
import { DISMISS_ALL_THRESHOLD } from './constants';

type Props = {
    autoDismissMs?: number;
};

function Alerts({ autoDismissMs }: Readonly<Props>) {
    const alerts = useSelector(selectors.selectMessages);
    const dispatch = useDispatch();

    // Danger toasts carry role="alert" and are announced on insertion by screen readers.
    // Success/info messages are mirrored into a persistent visually-hidden live region
    // instead, because polite role insertions are not announced consistently. Only newer
    // alerts update the region — falling back to an older alert when the newest one is
    // dismissed would re-announce stale content.
    const announcedIdRef = useRef(-1);
    const [announcedMessage, setAnnouncedMessage] = useState('');

    useEffect(() => {
        const newest = [...alerts].reverse().find((alert) => alert.color !== 'danger');
        if (!newest || newest.id <= announcedIdRef.current) return;
        announcedIdRef.current = newest.id;
        setAnnouncedMessage(sanitizeAlertMessage(newest.message));
    }, [alerts]);

    return (
        <div
            data-testid="alerts-container"
            className="pointer-events-none fixed bottom-4 right-4 z-[9999] flex max-h-[calc(100vh-2rem)] w-[min(420px,calc(100vw-2rem))] flex-col gap-2"
        >
            <output
                data-testid="alerts-announcer"
                className="sr-only"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: mirrors the toast message for screen readers; sanitized with the same DOMPurify allowlist as the visible card
                dangerouslySetInnerHTML={{ __html: announcedMessage }}
            />
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
