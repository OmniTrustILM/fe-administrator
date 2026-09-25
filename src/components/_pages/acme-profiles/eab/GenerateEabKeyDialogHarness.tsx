import { useMemo, useRef, useState } from 'react';
import { of, throwError } from 'rxjs';
import { createMockStore, withProviders } from 'utils/test-helpers';
import GenerateEabKeyDialog from './GenerateEabKeyDialog';

type Props = Readonly<{
    generatedKey?: string;
    fail?: boolean;
}>;

export default function GenerateEabKeyDialogHarness({ generatedKey = 'generated-key', fail = false }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [, setTick] = useState(0);
    const store = useMemo(() => createMockStore(), []);
    const generations = useRef(0);
    const generateKey = () => {
        generations.current += 1;
        return fail ? throwError(() => new Error('boom')) : of({ key: `${generatedKey}-${generations.current}` });
    };

    return withProviders(
        <div>
            <button type="button" data-testid="open" onClick={() => setIsOpen(true)}>
                Open
            </button>
            <span data-testid="state">{isOpen ? 'open' : 'closed'}</span>
            <button type="button" data-testid="rerender" onClick={() => setTick((tick) => tick + 1)}>
                Rerender
            </button>
            <GenerateEabKeyDialog isOpen={isOpen} onClose={() => setIsOpen(false)} generateKey={generateKey} />
        </div>,
        { store },
    );
}
