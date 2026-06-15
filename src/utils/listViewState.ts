export const WorkflowListKey = {
    rules: 'workflows:rules',
    conditions: 'workflows:conditions',
    triggers: 'workflows:triggers',
    actions: 'workflows:actions',
    executions: 'workflows:executions',
} as const;

export const LIST_VIEW_SCOPES: Record<string, string[]> = {
    [WorkflowListKey.rules]: ['/rules'],
    [WorkflowListKey.conditions]: ['/rules', '/conditions'],
    [WorkflowListKey.triggers]: ['/triggers'],
    [WorkflowListKey.actions]: ['/actions'],
    [WorkflowListKey.executions]: ['/actions', '/executions'],
};

export function isPathInScope(path: string, prefixes: string[]): boolean {
    return prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function persistPaginationKey(listKey: string): string {
    return `custom-table-persistent:${listKey}`;
}
