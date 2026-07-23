import AttributeEditor from 'components/Attributes/AttributeEditor';
import type { TableDataRow, TableHeader } from 'components/CustomTable';
import type { WidgetButtonProps } from 'components/WidgetButtons';
import { useMemo } from 'react';
import type { AttributeResponseModel, CustomAttributeModel } from 'types/attributes';
import type { CertificateGroupResponseModel } from 'types/certificateGroups';
import type { Resource, UserDto } from 'types/openapi';

export function getEditAndDeleteWidgetButtons(
    onEditClick: (event: React.MouseEvent) => void,
    setConfirmDelete: (value: boolean) => void,
): WidgetButtonProps[] {
    return [
        {
            icon: 'pencil',
            disabled: false,
            tooltip: 'Edit',
            onClick: (event) => {
                onEditClick(event);
            },
        },
        {
            icon: 'trash',
            disabled: false,
            tooltip: 'Delete',
            onClick: () => {
                setConfirmDelete(true);
            },
        },
    ];
}

export function createWidgetDetailHeaders(): TableHeader[] {
    return [
        {
            id: 'property',
            content: 'Property',
        },
        {
            id: 'value',
            content: 'Value',
        },
    ];
}

export function createTableDataRow(label: string, value: React.ReactNode): TableDataRow {
    return {
        id: label.toLowerCase().replaceAll(/[^a-z0-9]/g, ''),
        columns: [label, value ?? ''],
    };
}

export function buildOwner(userOptions: { value: string; label: string }[], ownerUuid?: string) {
    if (!ownerUuid) return undefined;
    return userOptions.find((user) => user.value === ownerUuid);
}

export function buildGroups(groupOptions: { value: string; label: string }[], groupUuids?: string[]) {
    if (!groupUuids) return [];
    return groupUuids
        .map((groupId) => groupOptions.find((group) => group.value === groupId))
        .filter((group): group is { value: string; label: string } => group !== undefined);
}

export function buildSelectedOption<T>(value: T | undefined, label: string) {
    return value ? { value, label } : undefined;
}

export function buildUserOption(user: { uuid: string; firstName?: string; lastName?: string; username: string }) {
    const first = user.firstName ? user.firstName + ' ' : '';
    const last = user.lastName ? user.lastName + ' ' : '';
    return {
        value: user.uuid,
        label: `${first}${last} (${user.username})`,
    };
}

function useAttributeEditor({
    isBusy,
    id,
    resourceKey,
    attributes,
    multipleResourceCustomAttributes,
    withRemoveAction = false,
}: {
    isBusy: boolean;
    id: string;
    resourceKey: Resource;
    attributes: AttributeResponseModel[] | undefined;
    multipleResourceCustomAttributes: Record<string, CustomAttributeModel[]>;
    withRemoveAction?: boolean;
}) {
    return useMemo(() => {
        if (isBusy) return <></>;
        return (
            <AttributeEditor
                id={id}
                attributeDescriptors={multipleResourceCustomAttributes[resourceKey] || []}
                attributes={attributes}
                withRemoveAction={withRemoveAction}
            />
        );
    }, [isBusy, id, resourceKey, attributes, multipleResourceCustomAttributes, withRemoveAction]);
}

export default useAttributeEditor;

export const getOwnerName = (ownerUuid: string | undefined, users: UserDto[]): string => {
    if (!ownerUuid) return 'Unassigned';
    const user = users.find((user) => user.uuid === ownerUuid);
    return user ? user.username : 'Unassigned';
};

export const getGroupNames = (groupUuids: string[] | undefined, groups: CertificateGroupResponseModel[]): string[] | 'N/A' => {
    if (!groupUuids) return 'N/A';
    return groupUuids.map((groupUuid) => {
        const group = groups.find((group) => group.uuid === groupUuid);
        return group ? group.name : 'N/A';
    });
};
