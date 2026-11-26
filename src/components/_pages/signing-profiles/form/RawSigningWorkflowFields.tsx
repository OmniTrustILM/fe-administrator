import type { ReactElement } from 'react';
import CertificatePurposeFields from './CertificatePurposeFields';

/** The raw-signing workflow tab. Raw signing has no formatting, so the tab holds only the certificate purpose. */
export default function RawSigningWorkflowFields(): ReactElement {
    return (
        <div className="space-y-4">
            <p className="text-sm text-content-muted">
                Integrators submit digests through the ILM Native API. The signature algorithm, and with it the digest algorithm each
                request must name, follows the certificate's key and the Signing Operation Attributes on the Signing Scheme tab.
            </p>
            <CertificatePurposeFields />
        </div>
    );
}
