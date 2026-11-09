import Badge, { type BadgeColor } from 'components/Badge';
import { FilterFieldSource } from 'types/openapi';

/** The full name of each field source, as shown on the column source badge and in the add-column menu. */
export const SOURCE_LABELS: Readonly<Record<FilterFieldSource, string>> = {
    [FilterFieldSource.Property]: 'Property',
    [FilterFieldSource.Custom]: 'Custom attribute',
    [FilterFieldSource.Meta]: 'Metadata',
    [FilterFieldSource.Data]: 'Data attribute',
};

/** One colour per source, so a field's origin is readable at a glance down a long list. */
export const SOURCE_COLORS: Readonly<Record<FilterFieldSource, BadgeColor>> = {
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
}>;

export default function SourceBadge({ source }: Props) {
    const label = SOURCE_LABELS[source];
    return (
        // normal-case is load-bearing: a table header row is `uppercase`, and a sortable heading's
        // button resets it while a plain one does not, so inheriting renders the same badge two ways.
        <Badge color={SOURCE_COLORS[source]} size="small" className="shrink-0 normal-case" title={label} dataTestId="source-badge">
            <span aria-hidden="true">{SOURCE_ABBREVIATIONS[source]}</span> <span className="sr-only">{label}</span>
        </Badge>
    );
}
