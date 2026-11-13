import { useState } from 'react';
import Select, { type OptionValue } from './index';
import Dialog from 'components/Dialog';

type SingleValueState = OptionValue | { value: OptionValue; label: string } | null;
type MultiOption = { value: string | number; label: string };

const BASE_OPTIONS = [
    { value: '1', label: 'Option 1' },
    { value: '2', label: 'Option 2' },
    { value: '3', label: 'Option 3' },
];

export function SingleHarness({ initial = '', isClearable = false }: { initial?: string; isClearable?: boolean }) {
    const [v, setV] = useState<SingleValueState>(initial);
    return (
        <div>
            <Select id="h" value={v} onChange={(nv) => setV(nv)} options={BASE_OPTIONS} isClearable={isClearable} dataTestId="sel" />
            <div data-testid="value-display">{typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')}</div>
        </div>
    );
}

export function MultiHarness({ initial = [] as MultiOption[] }) {
    const [v, setV] = useState<MultiOption[] | undefined>(initial);
    return (
        <div>
            <Select id="m" value={v ?? []} onChange={(nv) => setV(nv)} options={BASE_OPTIONS} isMulti dataTestId="sel" />
            <div data-testid="value-display">{v === undefined ? 'undefined' : JSON.stringify(v)}</div>
        </div>
    );
}

export function SearchableMultiHarness({ initial = [] as { value: string | number; label: string }[] }) {
    const [v, setV] = useState<{ value: string | number; label: string }[] | undefined>(initial);
    return (
        <div>
            <Select
                id="sm"
                value={v ?? []}
                onChange={(nv) => setV(nv)}
                options={[
                    { value: '1', label: 'Apple' },
                    { value: '2', label: 'Banana' },
                    { value: '3', label: 'Cherry' },
                ]}
                isMulti
                isSearchable
                dataTestId="sel"
            />
            <div data-testid="value-display">{v === undefined ? 'undefined' : JSON.stringify(v)}</div>
        </div>
    );
}

export function SelectPlusDialogHarness() {
    const [v, setV] = useState<SingleValueState>('');
    const [open, setOpen] = useState(false);
    return (
        <div>
            <Select id="d" value={v} onChange={(nv) => setV(nv)} options={BASE_OPTIONS} dataTestId="sel" />
            <button type="button" data-testid="open-dialog" onClick={() => setOpen(true)} style={{ position: 'fixed', top: 0, right: 0 }}>
                Open dialog
            </button>
            <Dialog isOpen={open} toggle={() => setOpen(false)} caption="Test dialog" body={<div>hello</div>} />
        </div>
    );
}

export function SearchableHarness() {
    const [v, setV] = useState<SingleValueState>('');
    return (
        <div>
            <Select
                id="s"
                value={v}
                onChange={(nv) => setV(nv)}
                options={[
                    { value: '1', label: 'Apple' },
                    { value: '2', label: 'Banana' },
                    { value: '3', label: 'Cherry' },
                ]}
                isSearchable
                dataTestId="sel"
            />
            <div data-testid="value-display">{typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v ?? '')}</div>
        </div>
    );
}

export function BlurHarness({ isSearchable = false, isMulti = false }: { isSearchable?: boolean; isMulti?: boolean }) {
    const [single, setSingle] = useState<SingleValueState>('');
    const [multi, setMulti] = useState<MultiOption[] | undefined>([BASE_OPTIONS[0], BASE_OPTIONS[1]]);
    const [blurCount, setBlurCount] = useState(0);
    const onBlur = () => setBlurCount((c) => c + 1);
    return (
        <div>
            {isMulti ? (
                <Select
                    id="b"
                    value={multi ?? []}
                    onChange={(nv) => setMulti(nv)}
                    onBlur={onBlur}
                    options={BASE_OPTIONS}
                    isMulti
                    dataTestId="sel"
                />
            ) : (
                <Select
                    id="b"
                    value={single}
                    onChange={(nv) => setSingle(nv)}
                    onBlur={onBlur}
                    options={BASE_OPTIONS}
                    isSearchable={isSearchable}
                    dataTestId="sel"
                />
            )}
            {/* An input, not a button: WebKit on macOS does not move Tab focus to buttons. */}
            <input aria-label="Next field" />
            <div data-testid="blur-count">{blurCount}</div>
        </div>
    );
}

export function ToneHarness() {
    return (
        <div>
            <Select id="valid" value="" onChange={() => {}} options={BASE_OPTIONS} dataTestId="valid" />
            <Select
                id="invalid"
                value=""
                onChange={() => {}}
                options={BASE_OPTIONS}
                error="Required Field"
                dataTestId="invalid"
                isSearchable
            />
        </div>
    );
}
