import Button from 'components/Button';
import { Copy } from 'lucide-react';
import { useCopyToClipboard } from 'utils/common-hooks';

type Props = {
    /**
     * The URL to display and copy. Passed as the child (not a prop) so that CustomTable's
     * client-side sort, which reads cell text via jsxInnerText, sorts on the visible URL.
     */
    children?: string;
    /** Human-readable label for the URL, used in the copy button title and toasts (e.g. "Signing URL"). */
    label: string;
};

/**
 * Renders a protocol URL with an inline copy-to-clipboard button.
 * Used in the protocol profile listings (ACME, SCEP, CMP, TSP) for visual and behavioural parity.
 */
const CopyUrlCell = ({ children: url, label }: Props) => {
    const copyToClipboard = useCopyToClipboard();

    if (!url) {
        return null;
    }

    return (
        <span className="flex items-center gap-1">
            <span className="text-sm min-w-0 truncate">{url}</span>
            <Button
                variant="transparent"
                color="primary"
                title={`Copy ${label}`}
                aria-label={`Copy ${label}`}
                onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(url, `${label} was copied to clipboard`, `Failed to copy ${label} to clipboard`);
                }}
            >
                <Copy size={16} />
            </Button>
        </span>
    );
};

export default CopyUrlCell;
