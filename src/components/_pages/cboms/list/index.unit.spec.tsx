import { act } from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import ThemeProvider from 'components/ThemeProvider';
import { actions as cbomActions } from 'ducks/cbom';
import { actions as customAttributeActions } from 'ducks/customAttributes';
import { EntityType } from 'ducks/filters';
import { actions as pagingActions } from 'ducks/paging';
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

    /** Renders the list, opens the upload dialog with no CBOM custom attributes defined, and pastes the document. */
    const openUploadWithDocument = async () => {
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
        return { store, dispatch, content };
    };

    test('passes the whole upload request the dialog builds to uploadCbom', async () => {
        const { dispatch, content } = await openUploadWithDocument();

        await act(async () => {
            content?.closest('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        });

        await vi.waitFor(() => expect(dispatch).toHaveBeenCalledWith(cbomActions.uploadCbom({ content: cbom, customAttributes: [] })));
    });

    test('closes the dialog and reads the list again when Core stored the CBOM without its custom attributes', async () => {
        const { store, dispatch } = await openUploadWithDocument();

        await act(async () => {
            store.dispatch(cbomActions.uploadCbom({ content: cbom, customAttributes: [] }));
        });
        await act(async () => {
            store.dispatch(cbomActions.uploadCbomStoredWithoutAttributes({ error: 'attributes refused' }));
        });

        expect(document.body.querySelector('textarea')).toBeNull();
        expect(dispatch).toHaveBeenCalledWith(pagingActions.resetPaging({ entity: EntityType.CBOM }));
    });
});
