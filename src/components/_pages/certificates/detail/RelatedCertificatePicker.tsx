import CertificateList from 'components/_pages/certificates/list';
import { selectors } from 'ducks/certificates';
import { useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import type { CertificateListResponseModel } from 'types/certificate';

type Props = Readonly<{
    onSelect: (certificate: CertificateListResponseModel | undefined) => void;
}>;

/**
 * The list the related-certificate dialog picks from. A picker rather than the inventory, as on the locations
 * page: a view strip would apply its view's filters over the subject-type filter the dialog opens with.
 */
export default function RelatedCertificatePicker({ onSelect }: Props) {
    const certificates = useSelector(selectors.certificates);
    const picked = useRef<CertificateListResponseModel | undefined>(undefined);

    // The row is kept from when it is picked: the list holds one page, so a selection outliving it could not be read back.
    const onCheckedRowsChanged = useCallback(
        (rows: (string | number)[]) => {
            const uuid = rows[0];
            const kept = picked.current?.uuid === uuid ? picked.current : undefined;
            picked.current = certificates.find((certificate) => certificate.uuid === uuid) ?? kept;
            onSelect(picked.current);
        },
        [certificates, onSelect],
    );

    return (
        <CertificateList
            selectCertsOnly
            hideAdditionalButtons={true}
            hideWidgetButtons={true}
            multiSelect={false}
            isLinkDisabled={true}
            onCheckedRowsChanged={onCheckedRowsChanged}
        />
    );
}
