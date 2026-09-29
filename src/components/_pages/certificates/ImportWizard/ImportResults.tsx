import Badge, { type BadgeColor } from 'components/Badge';
import Button from 'components/Button';
import Container from 'components/Container';
import ProgressButton from 'components/ProgressButton';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ImportOutcome, Resource, type CertificateImportResultDto, type InspectedEntryDto } from 'types/openapi';
import { entryTitle, kindLabel } from './importRequest';
import WizardSection from './WizardSection';

const LINK_CLASS = 'font-medium text-brand hover:text-brand-hover';

type ResultBadge = { label: string; color: BadgeColor };

const IMPORTED: ResultBadge = { label: 'Imported', color: 'success' };
const NOT_IMPORTED: ResultBadge = { label: 'Not imported', color: 'danger' };
// An object already in the inventory is left as it was, so it is not badged as a success.
const OUTCOME_BADGES: Record<ImportOutcome, ResultBadge> = {
    [ImportOutcome.Created]: IMPORTED,
    [ImportOutcome.Existing]: { label: 'Already in inventory', color: 'secondary' },
    [ImportOutcome.Adopted]: { label: 'Private key added to an existing key', color: 'success' },
};

/** What became of the entry. A key entry's certificates follow its key, so the key's outcome is the entry's. */
function badgeOf(result: CertificateImportResultDto): ResultBadge {
    if (!result.imported) return NOT_IMPORTED;
    const outcome = result.keyOutcome ?? result.certificateOutcome;
    return outcome ? OUTCOME_BADGES[outcome] : IMPORTED;
}

type Props = Readonly<{
    entries: InspectedEntryDto[];
    results: CertificateImportResultDto[];
    isImporting: boolean;
    retryDisabled: boolean;
    onRetry: () => void;
    /** Goes back to the form, with every value as it was sent, so that what failed can be changed and sent again. */
    onEdit: () => void;
    onDone: () => void;
    /** Shown above the buttons, for what a retry needs again. */
    children?: ReactNode;
}>;

export default function ImportResults({ entries, results, isImporting, retryDisabled, onRetry, onEdit, onDone, children }: Props) {
    const hasFailures = results.some((result) => !result.imported);

    return (
        <div className="space-y-4">
            <WizardSection id="importResults" title="Import results" focusTitle>
                <ul className="space-y-2">
                    {results.map((result) => {
                        const entry = entries.find((each) => each.entryReference === result.entryReference);
                        const badge = badgeOf(result);
                        return (
                            <li key={result.entryReference} className="flex items-start gap-3 rounded-lg border border-outline px-4 py-3">
                                <Badge color={badge.color}>{badge.label}</Badge>
                                <div className="min-w-0 space-y-1 text-sm">
                                    <p className="font-medium text-content">{entry ? entryTitle(entry) : kindLabel(result.kind)}</p>
                                    {result.imported ? (
                                        <p className="flex gap-3">
                                            {result.certificateUuid && (
                                                <Link
                                                    to={`/${Resource.Certificates.toLowerCase()}/detail/${result.certificateUuid}`}
                                                    className={LINK_CLASS}
                                                >
                                                    Open certificate
                                                </Link>
                                            )}
                                            {result.keyUuid && (
                                                <Link
                                                    to={`/${Resource.Keys.toLowerCase()}/detail/${result.keyUuid}`}
                                                    className={LINK_CLASS}
                                                >
                                                    Open key
                                                </Link>
                                            )}
                                        </p>
                                    ) : (
                                        <p className="text-content-muted">{result.message}</p>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </WizardSection>

            {children}

            <Container className="flex-row justify-end modal-footer" gap={4}>
                {hasFailures && (
                    <>
                        <ProgressButton
                            type="button"
                            title="Retry failed entries"
                            inProgressTitle="Retrying..."
                            inProgress={isImporting}
                            disabled={retryDisabled}
                            onClick={onRetry}
                        />
                        <Button variant="outline" onClick={onEdit} disabled={isImporting} type="button">
                            Back to edit
                        </Button>
                    </>
                )}
                <Button variant={hasFailures ? 'outline' : 'solid'} onClick={onDone} disabled={isImporting} type="button">
                    Done
                </Button>
            </Container>
        </div>
    );
}
