import { useState } from 'react';
import Select from './index';

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
