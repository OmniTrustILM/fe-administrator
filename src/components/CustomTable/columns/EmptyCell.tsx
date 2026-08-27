/**
 * The cell of a row that has no value for a column. An em dash rather than a blank cell, which
 * reads as a rendering fault, and rather than the attribute fallback's `'Not set'`, which is
 * detail-page copy. Empty is one state, not one per content type, so every column uses this.
 */
export default function EmptyCell() {
    return (
        <span className="text-content-subtle" data-testid="empty-cell">
            <span aria-hidden="true">&mdash;</span>
            <span className="sr-only">No value</span>
        </span>
    );
}
