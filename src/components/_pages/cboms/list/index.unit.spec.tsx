import { act } from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import ThemeProvider from 'components/ThemeProvider';
import { actions as cbomActions } from 'ducks/cbom';
import { actions as customAttributeActions } from 'ducks/customAttributes';
import { reducers } from 'ducks/reducers';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { setupReactActEnvironment } from '../../test-utils/reactActEnvironment';
import CbomsList from './index';

setupReactActEnvironment();

const cbom = { bomFormat: 'CycloneDX', specVersion: '1.6', metadata: { component: { name: 'CBOM-Lens' } } };

describe('CBOM list upload', () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    test('dispatches the upload request the dialog builds, custom attributes included', async () => {
        const store = configureStore({ reducer: reducers });
        const dispatch = vi.spyOn(store, 'dispatch');
        await act(async () => {
            root.render(
                <Provider store={store}>
                    <ThemeProvider>
                        <MemoryRouter initialEntries={['/cboms']}>
                            <CbomsList />
                        </MemoryRouter>
                    </ThemeProvider>
                </Provider>,
            );
        });

        const uploadButton = document.body.querySelector<HTMLButtonElement>('[data-testid="upload-button"]');
        expect(uploadButton).not.toBeNull();
        await act(async () => uploadButton?.click());
        await act(async () => {
            store.dispatch(customAttributeActions.listResourceCustomAttributesSuccess([]));
        });

        const content = document.body.querySelector<HTMLTextAreaElement>('textarea');
        expect(content).not.toBeNull();
        await act(async () => {
            Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(content, JSON.stringify(cbom));
            content?.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await act(async () => {
            content?.closest('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        });

        await vi.waitFor(() => expect(dispatch).toHaveBeenCalledWith(cbomActions.uploadCbom({ content: cbom, customAttributes: [] })));
    });
});
