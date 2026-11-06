import ActionsMenu, { type PageAction } from 'components/ActionsMenu';
import Breadcrumb, { type BreadcrumbItem } from 'components/Breadcrumb';
import Button from 'components/Button';
import { iconRegistry } from 'utils/icons';

export type PageHeaderProps = Readonly<{
    breadcrumbs: BreadcrumbItem[];
    title?: string;
    primaryAction?: PageAction;
    actions?: PageAction[];
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

function PageHeader({ breadcrumbs, title, primaryAction, actions = [] }: PageHeaderProps) {
    const hasActions = !!primaryAction || actions.length > 0;
    return (
        <Breadcrumb
            items={breadcrumbs}
            title={title}
            rightContent={
                hasActions ? (
                    <div className="flex shrink-0 items-center gap-2" data-testid="page-header-actions">
                        {primaryAction && <PrimaryActionButton action={primaryAction} />}
                        {actions.length > 0 && <ActionsMenu actions={actions} />}
                    </div>
                ) : undefined
            }
        />
    );
}

export default PageHeader;
