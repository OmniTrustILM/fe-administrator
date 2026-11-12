import { Info } from 'lucide-react';
import DismissButton from './DismissButton';

type Props = Readonly<{
    message?: string;
    onDismiss: () => void;
    dataTestId: string;
}>;

/**
 * What a tab switch did to the filters and the ordering. A view carries both, so a switch replaces what the user had
 * typed, and without this the changed rows read as a filter that was lost rather than a view that was applied.
 *
 * The region stays mounted while empty, out of the layout: a screen reader announces a live region's text changing,
 * and often skips one that arrives already holding its text.
 */
export default function ViewSwitchNotice({ message, onDismiss, dataTestId }: Props) {
    return (
        <output
            className={message ? 'flex items-center gap-x-3 rounded-lg bg-info-surface px-3 py-2 text-sm text-content' : 'sr-only'}
            data-testid={dataTestId}
        >
            {message && (
                <>
                    <Info className="size-4 shrink-0 text-info" aria-hidden="true" />
                    <span>{message}</span>
                    <DismissButton onClick={onDismiss} dataTestId={`${dataTestId}-dismiss`} />
                </>
            )}
        </output>
    );
}
