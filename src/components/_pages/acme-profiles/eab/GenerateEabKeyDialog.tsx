import { backendClient } from 'src/api';
import CopyUrlCell from 'components/CopyUrlCell';
import Dialog from 'components/Dialog';
import Spinner from 'components/Spinner';
import { actions as alertActions } from 'ducks/alerts';
import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import type { Observable } from 'rxjs';
import type { AcmeEabKeyDto } from 'types/openapi';
import { EAB_KEY_NOTICE } from 'utils/acme-eab';
import { extractError } from 'utils/net';

type Props = Readonly<{
    isOpen: boolean;
    onClose: () => void;
    generateKey?: () => Observable<AcmeEabKeyDto>;
}>;

const defaultGenerateKey = () => backendClient.acmeProfiles.generateEabKey();

// Not through an epic: the key must not be kept in client state, and the store would keep it.
export default function GenerateEabKeyDialog({ isOpen, onClose, generateKey = defaultGenerateKey }: Props) {
    const dispatch = useDispatch();
    const [key, setKey] = useState<string>();
    const [isGenerating, setIsGenerating] = useState(false);

    // Parents pass inline callbacks; regenerating on their identity would replace a key already shown.
    const onCloseRef = useRef(onClose);
    const generateKeyRef = useRef(generateKey);
    onCloseRef.current = onClose;
    generateKeyRef.current = generateKey;

    useEffect(() => {
        if (!isOpen) {
            setKey(undefined);
            return;
        }
        setIsGenerating(true);
        const subscription = generateKeyRef.current().subscribe({
            next: (dto) => {
                setKey(dto.key);
                setIsGenerating(false);
            },
            error: (err) => {
                setIsGenerating(false);
                dispatch(alertActions.error(extractError(err, 'Failed to generate External Account Binding key')));
                onCloseRef.current();
            },
        });
        return () => subscription.unsubscribe();
    }, [isOpen, dispatch]);

    return (
        <Dialog
            isOpen={isOpen}
            toggle={onClose}
            caption="External Account Binding key"
            size="lg"
            dataTestId="generate-eab-key-dialog"
            body={
                <div className="space-y-3">
                    <Spinner active={isGenerating} />
                    {key ? (
                        <>
                            <div className="rounded-lg border border-divider bg-surface-sunken p-3 font-mono" data-testid="eab-key">
                                <CopyUrlCell label="key">{key}</CopyUrlCell>
                            </div>
                            <p className="text-sm text-warning" role="status" data-testid="eab-key-notice">
                                {EAB_KEY_NOTICE}
                            </p>
                        </>
                    ) : null}
                </div>
            }
            buttons={[{ color: 'primary', body: 'Close', onClick: onClose }]}
        />
    );
}
