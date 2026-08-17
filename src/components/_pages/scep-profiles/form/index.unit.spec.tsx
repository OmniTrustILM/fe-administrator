import { configureStore } from '@reduxjs/toolkit';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { reducers } from 'ducks/reducers';
import { actions as customAttrActions } from 'ducks/customAttributes';
import { actions as raActions } from 'ducks/ra-profiles';
import { actions as scepActions } from 'ducks/scep-profiles';
import { AttributeContentType, AttributeType, Resource } from 'types/openapi';

import ScepProfileForm from './index';

// @ts-expect-error test env flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const descriptor = {
    type: AttributeType.Custom,
    name: 'textCustomAttr',
    uuid: 'ca-1',
    contentType: AttributeContentType.String,
    properties: { label: 'Text Custom Attr', required: false, readOnly: false, visible: true, list: false, multiSelect: false },
};

const caCert = { uuid: 'cert-1', commonName: 'Demo CA', serialNumber: '0123', publicKeyAlgorithm: 'RSA' };

const profile = {
    uuid: 'sp-1',
    name: 'scep1',
    description: '',
    renewThreshold: 10,
    includeCaCertificate: false,
    includeCaCertificateChain: false,
    enableIntune: false,
    enableChallengePassword: false,
    caCertificate: caCert,
    customAttributes: [
        {
            uuid: 'ca-1',
            name: 'textCustomAttr',
            contentType: AttributeContentType.String,
            type: AttributeType.Custom,
            content: [{ data: 'hello' }],
        },
    ],
    certificateAssociations: { ownerUuid: undefined, groupUuids: [], customAttributes: [] },
};

const raProfile = { uuid: 'ra-1', name: 'ra-one', enabled: true, authorityInstanceUuid: '', authorityInstanceName: '' };

function createStore() {
    return configureStore({
        reducer: reducers,
        middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false, immutableCheck: false }),
    });
}

describe('ScepProfileForm (edit mode)', () => {
    let root: Root;
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        vi.clearAllMocks();
    });

    async function renderForm(store: ReturnType<typeof createStore>, scepProfile: any = profile, caCertificates: any[] = [caCert]) {
        await act(async () => {
            root.render(
                <Provider store={store}>
                    <MemoryRouter initialEntries={['/']}>
                        <ScepProfileForm scepProfileId="sp-1" />
                    </MemoryRouter>
                </Provider>,
            );
        });
        await act(async () => {
            store.dispatch(scepActions.getScepProfileSuccess({ scepProfile }));
            store.dispatch(raActions.listRaProfilesSuccess({ raProfiles: [raProfile] as any }));
            store.dispatch(
                customAttrActions.receiveMultipleResourceCustomAttributes([
                    { resource: Resource.ScepProfiles, customAttributes: [descriptor] as any },
                    { resource: Resource.Certificates, customAttributes: [] },
                ]),
            );
            store.dispatch(scepActions.listScepCaCertificatesSuccess({ certificates: caCertificates }));
        });
        await act(async () => {});
    }

    function submitButton() {
        return container.querySelector('button[type="submit"]') as HTMLButtonElement;
    }

    async function changeCustomAttribute(value: string) {
        const input = container.querySelector(
            '[data-testid="text-input-__attributes__customScepProfile__.textCustomAttr"]',
        ) as HTMLInputElement;
        expect(input).toBeTruthy();
        const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
        await act(async () => {
            setValue.call(input, value);
            input.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await act(async () => {});
    }

    it('keeps Update disabled until something changes, then enables it', async () => {
        await renderForm(createStore());

        expect(submitButton().disabled).toBe(true);
        await changeCustomAttribute('changed-value');
        expect(submitButton().disabled).toBe(false);
    });

    it('keeps the saved CA certificate and allows Update when the certificate is missing from the eligibility list', async () => {
        const store = createStore();
        const dispatched: unknown[] = [];
        const originalDispatch = store.dispatch;
        (store as any).dispatch = (action: any) => {
            dispatched.push(action);
            return originalDispatch(action);
        };
        await renderForm(store, profile, [{ uuid: 'other-cert', commonName: 'Other', serialNumber: '9' }]);

        await changeCustomAttribute('changed-value');
        expect(submitButton().disabled).toBe(false);

        const form = container.querySelector('form') as HTMLFormElement;
        await act(async () => {
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        });
        await act(async () => {});

        const update = dispatched.find((a: any) => a.type === scepActions.updateScepProfile.type) as any;
        expect(update).toBeTruthy();
        expect(update.payload.updateScepRequest.caCertificateUuid).toBe('cert-1');
    });

    it('drops the saved certificate when Intune is toggled, forcing a re-pick from the refreshed list', async () => {
        await renderForm(createStore(), profile, [{ uuid: 'other-cert', commonName: 'Other', serialNumber: '9' }]);

        const certificateTrigger = () => container.querySelector('[data-testid="select-certificateSelect-trigger"]') as HTMLElement;
        expect(certificateTrigger().textContent).toContain('Demo CA');

        const intuneSwitch = container.querySelector('[data-testid="switch-enableIntune-input"]') as HTMLInputElement;
        expect(intuneSwitch).toBeTruthy();
        await act(async () => {
            intuneSwitch.click();
        });
        await act(async () => {});

        // Eligibility rules changed — the stored CA is no longer offered and the field is cleared.
        expect(certificateTrigger().textContent).not.toContain('Demo CA');
    });

    it('allows Update when the certificate eligibility list is empty', async () => {
        await renderForm(createStore(), profile, []);

        await changeCustomAttribute('changed-value');
        expect(submitButton().disabled).toBe(false);
    });

    it('allows Update when the stored profile name does not match the creation pattern', async () => {
        await renderForm(createStore(), { ...profile, name: 'scep profile 1' });

        await changeCustomAttribute('changed-value');
        expect(submitButton().disabled).toBe(false);
    });

    it('defaults the challenge source to protocolDefault and sends it on submit', async () => {
        const store = createStore();
        const dispatched: unknown[] = [];
        const originalDispatch = store.dispatch;
        (store as any).dispatch = (action: any) => {
            dispatched.push(action);
            return originalDispatch(action);
        };
        await renderForm(store);

        const challengeSourceTrigger = container.querySelector('[data-testid="select-challengeSource-trigger"]') as HTMLElement;
        expect(challengeSourceTrigger).toBeTruthy();

        await changeCustomAttribute('changed-value');
        const form = container.querySelector('form') as HTMLFormElement;
        await act(async () => {
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        });
        await act(async () => {});

        const update = dispatched.find((a: any) => a.type === scepActions.updateScepProfile.type) as any;
        expect(update).toBeTruthy();
        expect(update.payload.updateScepRequest.challengeSource).toBe('protocolDefault');
    });

    it('disables the challenge password and Intune switches for a stored certificateRegistration profile', async () => {
        await renderForm(createStore(), { ...profile, challengeSource: 'certificateRegistration' });

        const challengePasswordSwitch = container.querySelector('[data-testid="switch-enableChallengePassword-input"]') as HTMLInputElement;
        const intuneSwitch = container.querySelector('[data-testid="switch-enableIntune-input"]') as HTMLInputElement;
        expect(challengePasswordSwitch.disabled).toBe(true);
        expect(intuneSwitch.disabled).toBe(true);
    });

    async function pickChallengeSource(code: string) {
        const trigger = container.querySelector('[data-testid="select-challengeSource-trigger"]') as HTMLButtonElement;
        await act(async () => {
            trigger.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
            trigger.click();
        });
        await act(async () => {});
        const option = Array.from(document.querySelectorAll('[role="option"]')).find((el) => el.textContent === code) as HTMLElement;
        expect(option).toBeTruthy();
        await act(async () => {
            option.click();
        });
        await act(async () => {});
    }

    it('offers only RSA CA certificates in registration mode and restores the full list on switch back', async () => {
        const ecdsaCert = { uuid: 'cert-ec', commonName: 'EC CA', serialNumber: '9', publicKeyAlgorithm: 'ECDSA' };
        await renderForm(createStore(), profile, [caCert, ecdsaCert]);

        const nativeOptions = () =>
            Array.from(container.querySelectorAll('[data-testid="select-certificateSelect-input"] option')).map((o) => o.textContent);
        expect(nativeOptions().join()).toContain('EC CA');

        await pickChallengeSource('certificateRegistration');
        // Registration-mode requests are enveloped via RSA key transport — core rejects other keys.
        expect(nativeOptions().join()).not.toContain('EC CA');
        expect(nativeOptions().join()).toContain('Demo CA');

        await pickChallengeSource('protocolDefault');
        expect(nativeOptions().join()).toContain('EC CA');
    });

    it('restores the toggles and normalizes the payload when flipping the challenge source', async () => {
        const store = createStore();
        const dispatched: unknown[] = [];
        const originalDispatch = store.dispatch;
        (store as any).dispatch = (action: any) => {
            dispatched.push(action);
            return originalDispatch(action);
        };
        await renderForm(store, { ...profile, enableIntune: true, intuneTenant: 't', intuneApplicationId: 'a' });

        const intuneSwitch = () => container.querySelector('[data-testid="switch-enableIntune-input"]') as HTMLInputElement;
        expect(intuneSwitch().checked).toBe(true);

        await pickChallengeSource('certificateRegistration');
        // The toggle renders as off while registration mode is active, but the value is only
        // normalized in the payload, so switching back must restore it.
        expect(intuneSwitch().checked).toBe(false);
        expect(intuneSwitch().disabled).toBe(true);

        const form = container.querySelector('form') as HTMLFormElement;
        await act(async () => {
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        });
        await act(async () => {});
        const update = dispatched.find((a: any) => a.type === scepActions.updateScepProfile.type) as any;
        expect(update).toBeTruthy();
        expect(update.payload.updateScepRequest.enableIntune).toBe(false);
        expect(update.payload.updateScepRequest.enableChallengePassword).toBe(false);
        expect(update.payload.updateScepRequest.challengePassword).toBeUndefined();

        await pickChallengeSource('protocolDefault');
        expect(intuneSwitch().checked).toBe(true);
        expect(intuneSwitch().disabled).toBe(false);
    });
});
