import CustomTable from 'components/CustomTable';
import { useState } from 'react';
import type { AuditLogDto, DelegateRecord } from 'types/openapi';
import { ActorType, AuthMethod, Module, Operation, OperationResult, Resource } from 'types/openapi';
import { withProviders } from 'utils/test-helpers';
import { auditLogsDetailRowHeaders, auditLogsRowHeaders, createAuditLogDetailData, createAuditLogsList } from './utils';

const enums = {
    actor: { user: { code: 'user', label: 'User' } },
    authMethod: { token: { code: 'token', label: 'Token' } },
    resource: { settings: { code: 'settings', label: 'Settings' } },
    module: { core: { code: 'core', label: 'Core' } },
    operation: { update: { code: 'update', label: 'Update' } },
    operationResult: { success: { code: 'success', label: 'Success' } },
};

export default function AuditDelegationTestHarness({ delegate }: Readonly<{ delegate?: DelegateRecord }>) {
    const [selected, setSelected] = useState<AuditLogDto>();
    const record: AuditLogDto = {
        id: 42,
        version: delegate ? '1.2' : '1.1',
        timestamp: '2026-10-24T12:00:00Z',
        loggedAt: '2026-10-24T12:00:01Z',
        module: Module.Core,
        actor: { type: ActorType.User, authMethod: AuthMethod.Token, uuid: 'user-42', name: 'Alice', delegate },
        resource: { type: Resource.Settings },
        operation: Operation.Update,
        operationResult: OperationResult.Success,
    };

    return withProviders(
        <div>
            <CustomTable headers={auditLogsRowHeaders} data={createAuditLogsList([record], enums, () => {}, setSelected)} />
            {selected && (
                <section aria-label="Audit log detail">
                    <CustomTable
                        headers={auditLogsDetailRowHeaders}
                        data={createAuditLogDetailData(selected, enums.resource, () => {}).map((item) => ({
                            id: item.property,
                            columns: [item.property, item.propertyValue],
                        }))}
                    />
                </section>
            )}
        </div>,
    );
}
