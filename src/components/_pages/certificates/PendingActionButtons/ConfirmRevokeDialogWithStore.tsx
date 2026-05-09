import type React from 'react';
import ConfirmRevokeDialog from './ConfirmRevokeDialog';
import { StoreWrapper } from './dialogTestHarness';

export type ConfirmRevokeDialogWithStoreProps = Readonly<React.ComponentProps<typeof ConfirmRevokeDialog>>;

export default function ConfirmRevokeDialogWithStore(props: ConfirmRevokeDialogWithStoreProps) {
    return (
        <StoreWrapper>
            <ConfirmRevokeDialog {...props} />
        </StoreWrapper>
    );
}
