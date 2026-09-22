import Badge, { type BadgeColor } from 'components/Badge';
import { FilterFieldSource } from 'types/openapi';

/**
 * Default labels for the four field sources. The platform publishes its own through
 * `PlatformEnum.FilterFieldSource`; a caller that has them passes one in, and these are what a
 * caller without them — or the picker before the enums have loaded — falls back to.
 */
export const DEFAULT_SOURCE_LABELS: Readonly<Record<FilterFieldSource, string>> = {
    [FilterFieldSource.Property]: 'Property',
    [FilterFieldSource.Custom]: 'Custom attribute',
    [FilterFieldSource.Meta]: 'Metadata',
    [FilterFieldSource.Data]: 'Data attribute',
};

/** One colour per source, so a field's origin is readable at a glance down a long list. */
const SOURCE_COLORS: Readonly<Record<FilterFieldSource, BadgeColor>> = {
    [FilterFieldSource.Property]: 'secondary',
    [FilterFieldSource.Custom]: 'info',
    [FilterFieldSource.Meta]: 'success',
    [FilterFieldSource.Data]: 'warning',
};

/** Short forms, because the badge sits before every field label and the full names crowd the row. */
const SOURCE_ABBREVIATIONS: Readonly<Record<FilterFieldSource, string>> = {
    [FilterFieldSource.Property]: 'Prop',
    [FilterFieldSource.Custom]: 'Custom',
    [FilterFieldSource.Meta]: 'Meta',
    [FilterFieldSource.Data]: 'Data',
};

type Props = Readonly<{
    source: FilterFieldSource;
    /** The full source name, announced to screen readers and shown on hover in place of the abbreviation. */
    label?: string;
}>;

export default function SourceBadge({ source, label = DEFAULT_SOURCE_LABELS[source] }: Props) {
    return (
        // normal-case is load-bearing: a table header row is `uppercase`, and a sortable heading's
        // button resets it while a plain one does not, so inheriting renders the same badge two ways.
        <Badge color={SOURCE_COLORS[source]} size="small" className="shrink-0 normal-case" title={label} dataTestId="source-badge">
            <span aria-hidden="true">{SOURCE_ABBREVIATIONS[source]}</span> <span className="sr-only">{label}</span>
        </Badge>
    );
}
