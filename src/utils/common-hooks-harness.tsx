import { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { useRecordingStore } from './test-helpers';
import {
    useWindowSize,
    useDeviceType,
    useCopyToClipboard,
    useRunOnSuccessfulFinish,
    useRunOnFailedFinish,
    useRunOnFinish,
    useAreDefaultValuesSame,
} from './common-hooks';

export function UseWindowSizeHarness() {
    const { width, height } = useWindowSize();
    return (
        <div data-testid="window-size">
            <span data-testid="width">{width}</span>
            <span data-testid="height">{height}</span>
        </div>
    );
}

export function UseDeviceTypeHarness() {
    const device = useDeviceType();
    return <div data-testid="device-type">{device}</div>;
}

export function UseCopyToClipboardHarness() {
    const copyToClipboard = useCopyToClipboard();
    return (
        <>
            <button type="button" data-testid="copy-btn" onClick={(e) => copyToClipboard('copied text', e.currentTarget, 'Error')}>
                Copy
            </button>
            <button type="button" data-testid="copy-unanchored-btn" onClick={() => copyToClipboard('copied text', null, 'Error')}>
                Copy without anchor
            </button>
        </>
    );
}

export function UseCopyToClipboardWithStore({ inDialog = false }: Readonly<{ inDialog?: boolean }>) {
    const { store, dispatched } = useRecordingStore(undefined, 'alerts/');
    return (
        <Provider store={store}>
            <div className="p-16">
                <div
                    role={inDialog ? 'dialog' : undefined}
                    className={inDialog ? 'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2' : undefined}
                >
                    <UseCopyToClipboardHarness />
                </div>
                <span data-testid="inverse-reference" className="bg-surface-inverse" />
                <pre data-testid="dispatched-alerts">{JSON.stringify(dispatched)}</pre>
            </div>
        </Provider>
    );
}

export function UseRunOnSuccessfulFinishHarness() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSucceeded, setIsSucceeded] = useState(false);
    const [callbackRan, setCallbackRan] = useState(false);
    useRunOnSuccessfulFinish(isLoading, isSucceeded, () => setCallbackRan(true));

    useEffect(() => {
        const t = setTimeout(() => {
            setIsLoading(false);
            setIsSucceeded(true);
        }, 100);
        return () => clearTimeout(t);
    }, []);

    return <div data-testid="successful-finish-result">{callbackRan ? 'ran' : 'pending'}</div>;
}

export function UseRunOnFailedFinishHarness() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSucceeded] = useState(false);
    const [callbackRan, setCallbackRan] = useState(false);
    useRunOnFailedFinish(isLoading, isSucceeded, () => setCallbackRan(true));

    useEffect(() => {
        const t = setTimeout(() => setIsLoading(false), 100);
        return () => clearTimeout(t);
    }, []);

    return <div data-testid="failed-finish-result">{callbackRan ? 'ran' : 'pending'}</div>;
}

export function UseRunOnFinishHarness() {
    const [isLoading, setIsLoading] = useState(true);
    const [callbackRan, setCallbackRan] = useState(false);
    useRunOnFinish(isLoading, () => setCallbackRan(true));

    useEffect(() => {
        const t = setTimeout(() => setIsLoading(false), 100);
        return () => clearTimeout(t);
    }, []);

    return <div data-testid="finish-result">{callbackRan ? 'ran' : 'pending'}</div>;
}

export function UseAreDefaultValuesSameHarness() {
    const defaultValues = { a: 1, b: 'x' };
    const areSame = useAreDefaultValuesSame(defaultValues);
    const same = areSame({ a: 1, b: 'x' });
    const diff = areSame({ a: 2, b: 'x' });
    const diffKeys = areSame({ a: 1, b: 'x', c: 3 });
    return (
        <div data-testid="compare-result">
            <span data-testid="same">{String(same)}</span>
            <span data-testid="diff">{String(diff)}</span>
            <span data-testid="diff-keys">{String(diffKeys)}</span>
        </div>
    );
}
