import { useState } from 'react';
import Dropdown from './index';

export function DropdownCloseFromInsideMenuHarness() {
    const [open, setOpen] = useState(false);
    return (
        <Dropdown
            title="Dropdown"
            items={[{ title: 'Item 1', onClick: () => {} }]}
            open={open}
            onOpenChange={setOpen}
            menu={
                <button type="button" data-testid="close-from-inside" onClick={() => setOpen(false)}>
                    Close
                </button>
            }
        />
    );
}
