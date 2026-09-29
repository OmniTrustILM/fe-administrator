import Badge from 'components/Badge';
import Checkbox from 'components/Checkbox';
import { selectors as enumSelectors, getEnumLabel } from 'ducks/enums';
import { useSelector } from 'react-redux';
import { KeyAlgorithm, KeyRequestType, PlatformEnum, type InspectedEntryDto } from 'types/openapi';
import { entryTitle, hasCertificate, keyRequestTypeOf, kindLabel, unselectableReason } from './importRequest';
import WizardSection from './WizardSection';

const KEY_NOUNS: Record<KeyRequestType, string> = {
    [KeyRequestType.KeyPair]: 'private key',
    [KeyRequestType.Secret]: 'secret key',
};

export const entryCount = (count: number) => `${count} ${count === 1 ? 'entry' : 'entries'}`;

/**
 * "RSA-2048 private key + certificate chain (3)" for a key and the kind for anything else, followed by the subject of
 * the entry's certificate when it has one.
 */
function describe(entry: InspectedEntryDto, algorithm: string | undefined): string {
    const type = keyRequestTypeOf(entry);
    const spec = [algorithm, entry.keyLength].filter(Boolean).join('-');
    const kind = type && spec ? `${spec} ${KEY_NOUNS[type]}` : kindLabel(entry.kind);
    const content = entry.chainLength ? `${kind} + certificate chain (${entry.chainLength})` : kind;
    return hasCertificate(entry) && entry.subjectDn ? `${content} · ${entry.subjectDn}` : content;
}

type Props = Readonly<{
    entries: InspectedEntryDto[];
    selected: string[];
    mayImportKeys: boolean;
    onToggle: (entry: InspectedEntryDto, checked: boolean) => void;
}>;

export default function DetectedContent({ entries, selected, mayImportKeys, onToggle }: Props) {
    const keyAlgorithmEnum = useSelector(enumSelectors.platformEnum(PlatformEnum.KeyAlgorithm));

    return (
        <WizardSection id="importDetectedContent" title={`Detected content – ${entryCount(entries.length)}`}>
            <ul className="space-y-2">
                {entries.map((entry) => {
                    const id = `importEntry-${entry.entryReference}`;
                    const reason = unselectableReason(entry, mayImportKeys);
                    const algorithm =
                        entry.keyAlgorithm && entry.keyAlgorithm !== KeyAlgorithm.Unknown
                            ? getEnumLabel(keyAlgorithmEnum, entry.keyAlgorithm)
                            : undefined;
                    return (
                        <li
                            key={entry.entryReference}
                            className="flex items-start justify-between gap-3 rounded-lg border border-outline px-4 py-3"
                        >
                            <div className="min-w-0">
                                <Checkbox
                                    id={id}
                                    label={entryTitle(entry)}
                                    checked={selected.includes(entry.entryReference)}
                                    disabled={!!reason}
                                    onChange={(checked) => onToggle(entry, checked)}
                                    ariaDescribedBy={reason ? `${id}-reason` : undefined}
                                />
                                <p className="ml-6 mt-1 text-xs text-content-muted">{describe(entry, algorithm)}</p>
                                {reason && (
                                    <p id={`${id}-reason`} className="ml-6 mt-1 text-xs text-content-muted">
                                        {reason}
                                    </p>
                                )}
                            </div>
                            {entry.importable === false ? (
                                <Badge color="warning" title={entry.notImportableReason}>
                                    Not supported by provider
                                </Badge>
                            ) : (
                                <Badge color={keyRequestTypeOf(entry) ? 'info' : 'secondary'}>{kindLabel(entry.kind)}</Badge>
                            )}
                        </li>
                    );
                })}
            </ul>
        </WizardSection>
    );
}
