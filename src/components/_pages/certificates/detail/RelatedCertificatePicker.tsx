import CertificateList from 'components/_pages/certificates/list';

type Props = Readonly<{
    onSelect: (uuid: string | undefined) => void;
}>;

/**
 * The list the related-certificate dialog picks from. A picker rather than the inventory, as on the locations
 * page: a view strip would apply its view's filters over the subject-type filter the dialog opens with.
 */
export default function RelatedCertificatePicker({ onSelect }: Props) {
    return (
        <CertificateList
            selectCertsOnly
            hideAdditionalButtons={true}
            hideWidgetButtons={true}
            multiSelect={false}
            isLinkDisabled={true}
            onCheckedRowsChanged={(rows) => onSelect(rows[0] as string | undefined)}
        />
    );
}
