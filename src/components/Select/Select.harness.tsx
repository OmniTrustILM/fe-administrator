import { useState } from 'react';
import Select from './index';
import Dialog from 'components/Dialog';

const BASE_OPTIONS = [
    { value: '1', label: 'Option 1' },
    { value: '2', label: 'Option 2' },
    { value: '3', label: 'Option 3' },
];

export function SingleHarness({ initial = '', isClearable = false }: { initial?: string; isClearable?: boolean }) {
    const [v, setV] = useState<any>(initial);
    return (
        <div>
            <Select id="h" value={v} onChange={(nv) => setV(nv)} options={BASE_OPTIONS} isClearable={isClearable} dataTestId="sel" />
            <div data-testid="value-display">{typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')}</div>
        </div>
    );
}

export function MultiHarness({ initial = [] as { value: string; label: string }[] }) {
    const [v, setV] = useState<typeof initial | undefined>(initial);
    return (
        <div>
            <Select id="m" value={v ?? []} onChange={(nv) => setV(nv as any)} options={BASE_OPTIONS} isMulti dataTestId="sel" />
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
    const [v, setV] = useState<any>('');
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
    const [v, setV] = useState<any>('');
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
            <div data-testid="value-display">{String(v ?? '')}</div>
        </div>
    );
}
