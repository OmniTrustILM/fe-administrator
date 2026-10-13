import { configureStore } from '@reduxjs/toolkit';
import { useMemo } from 'react';
import { Provider } from 'react-redux';
import CbomUploadDialog from '.';

type Props = Readonly<{
    onUpload: (data: { content: Record<string, unknown> }) => void;
}>;

const noop = () => {};

export default function CbomUploadDialogWithStore({ onUpload }: Props) {
    const store = useMemo(
        () =>
            configureStore({
                reducer: {
                    cbom: () => ({ isUploading: false }),
                    alerts: () => ({ messages: [] }),
                },
            }),
        [],
    );

    return (
        <Provider store={store}>
            <CbomUploadDialog onCancel={noop} onUpload={onUpload} />
        </Provider>
    );
}
