import type { CertificateImportResultDto } from 'types/openapi';
import ImportWizard from '../ImportWizard';

type Props = Readonly<{
    onCancel: () => void;
    onDone: (results: CertificateImportResultDto[]) => void;
}>;

export default function CertificateImportDialog({ onCancel, onDone }: Props) {
    return (
        <>
            <p className="text-sm text-content-muted mb-4">
                PEM, DER, PKCS7, PKCS12 or PKCS8 files. Content is shown before anything is imported.
            </p>
            <ImportWizard onCancel={onCancel} onDone={onDone} />
        </>
    );
}
