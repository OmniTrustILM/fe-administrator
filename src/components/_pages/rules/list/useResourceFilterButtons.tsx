import { useMemo } from 'react';
import Select from 'components/Select';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import type { Resource } from 'types/openapi';

type ResourceOption = {
    label: string;
    value: unknown;
};

type Params = {
    resourceOptionsWithRuleEvaluator: ResourceOption[];
    selectedResource?: Resource;
    setSelectedResource: (resource?: Resource) => void;
    checkedRows: string[];
    handleOpenAddModal: () => void;
    setConfirmDelete: (open: boolean) => void;
};

export function useResourceFilterButtons({
    resourceOptionsWithRuleEvaluator,
    selectedResource,
    setSelectedResource,
    checkedRows,
    handleOpenAddModal,
    setConfirmDelete,
}: Params): WidgetButtonProps[] {
    return useMemo(
        () => [
            {
                icon: 'search',
                disabled: false,
                tooltip: 'Select Resource',
                onClick: () => {},
                custom: (
                    <Select
                        placeholder="Select Resource"
                        minWidth={180}
                        id="resource"
                        options={resourceOptionsWithRuleEvaluator}
                        value={selectedResource || 'Select Resource'}
                        onChange={(value) => {
                            setSelectedResource((value || undefined) as Resource | undefined);
                        }}
                        isClearable
                    />
                ),
            },
            {
                icon: 'plus',
                disabled: false,
                tooltip: 'Create',
                onClick: handleOpenAddModal,
            },
            {
                icon: 'trash',
                disabled: checkedRows.length === 0,
                tooltip: 'Delete',
                onClick: () => setConfirmDelete(true),
            },
        ],
        [checkedRows.length, resourceOptionsWithRuleEvaluator, selectedResource, handleOpenAddModal, setConfirmDelete, setSelectedResource],
    );
}
