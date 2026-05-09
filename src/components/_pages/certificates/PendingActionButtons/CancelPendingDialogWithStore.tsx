import type React from 'react';
import CancelPendingDialog from './CancelPendingDialog';
import { StoreWrapper } from './dialogTestHarness';

export type CancelPendingDialogWithStoreProps = Readonly<React.ComponentProps<typeof CancelPendingDialog>>;

export default function CancelPendingDialogWithStore(props: CancelPendingDialogWithStoreProps) {
    return (
        <StoreWrapper>
            <CancelPendingDialog {...props} />
        </StoreWrapper>
    );
}
