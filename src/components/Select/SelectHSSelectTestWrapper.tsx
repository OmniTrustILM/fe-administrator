import { useLayoutEffect } from 'react';
import Select from './index';

const options = [
    { value: '1', label: 'One' },
    { value: '2', label: 'Two' },
];

export default function SelectHSSelectTestWrapper() {
    useLayoutEffect(() => {
        (globalThis as any).HSSelect = {
            getInstance: () => null,
            autoInit: () => {},
        };
        return () => {
            delete (globalThis as any).HSSelect;
        };
    }, []);

    return <Select id="hs-select-test" value="1" onChange={() => {}} options={options} />;
}
