import { useEffect, useState } from 'react';
import Select from 'components/Select';
import Button from 'components/Button';
import { Plus } from 'lucide-react';
import type { Availability } from 'utils/availability';

interface SelectChangeValue {
    value: string;
    label: string;
}

export interface NewRowWidgetProps {
    newItemsList: SelectChangeValue[];
    isBusy: boolean;
    onAddClick: (newValues: SelectChangeValue[]) => void;
    immediateAdd?: boolean;
    selectHint?: string;
    requires?: Availability;
}

const NewRowWidget = ({ newItemsList, isBusy, onAddClick, immediateAdd, selectHint, requires }: NewRowWidgetProps) => {
    const denied = !!requires && !requires.available;
    const [selectedItems, setSelectedItems] = useState<SelectChangeValue[]>([]);

    useEffect(() => {
        if (immediateAdd && selectedItems.length) {
            onAddClick(selectedItems);
            setSelectedItems([]);
        }
    }, [immediateAdd, selectedItems, onAddClick]);

    return (
        <div className="flex gap-1">
            <div className="grow">
                <Select
                    onChange={(values) => {
                        setSelectedItems((values ?? []).map((item) => ({ value: String(item.value), label: item.label })));
                    }}
                    isMulti
                    value={selectedItems}
                    options={newItemsList}
                    placeholder={(denied && requires.reason) || selectHint || 'Select items to add'}
                    id="newRowWidgetSelect"
                    isDisabled={denied}
                />
            </div>
            {selectedItems?.length && !immediateAdd ? (
                <div className="flex">
                    <Button
                        disabled={isBusy}
                        requires={requires}
                        variant="transparent"
                        color="secondary"
                        title="Add"
                        onClick={() => {
                            onAddClick(selectedItems);
                            setSelectedItems([]);
                        }}
                    >
                        <Plus />
                    </Button>
                </div>
            ) : null}
        </div>
    );
};

export default NewRowWidget;
