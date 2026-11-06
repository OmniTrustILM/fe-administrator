import ActionsMenu, { type PageAction } from 'components/ActionsMenu';
import Breadcrumb, { type BreadcrumbItem } from 'components/Breadcrumb';
import Button from 'components/Button';
import { useWidgetLock } from 'components/Widget/useWidgetLock';
import type { LockWidgetNameEnum } from 'types/user-interface';
import { iconRegistry } from 'utils/icons';

export type PageHeaderProps = Readonly<{
    breadcrumbs: BreadcrumbItem[];
    title?: string;
    primaryAction?: PageAction;
    actions?: PageAction[];
    /** The lock of the page's main widget; while it is set every action is unavailable. */
    widgetLockName?: LockWidgetNameEnum;
}>;

function PrimaryActionButton({ action }: Readonly<{ action: PageAction }>) {
    const Icon = iconRegistry[action.icon];
    return (
        <Button
            color="primary"
            disabled={action.disabled}
            disabledTooltip={action.disabledReason}
            onClick={(event) => action.onClick(event.currentTarget as HTMLElement)}
            data-testid={`page-action-${action.id}`}
        >
            <span aria-hidden>
                <Icon size={16} />
            </span>
            {action.label}
        </Button>
    );
}

function PageHeader({ breadcrumbs, title, primaryAction, actions = [], widgetLockName }: PageHeaderProps) {
    const lock = useWidgetLock(widgetLockName);
    const applyLock = (action: PageAction): PageAction => (lock ? { ...action, disabled: true, disabledReason: lock.lockTitle } : action);
    const primary = primaryAction && applyLock(primaryAction);
    const menu = actions.map(applyLock);
    const hasActions = !!primary || menu.length > 0;

    return (
        <Breadcrumb
            items={breadcrumbs}
            title={title}
            rightContent={
                hasActions ? (
                    <div className="flex shrink-0 items-center gap-2" data-testid="page-header-actions">
                        {primary && <PrimaryActionButton action={primary} />}
                        {menu.length > 0 && <ActionsMenu actions={menu} />}
                    </div>
                ) : undefined
            }
        />
    );
}

export default PageHeader;
