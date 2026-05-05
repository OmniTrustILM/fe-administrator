import Badge from 'components/Badge';
import type { BadgeColor } from 'components/Badge';
import { SecretState } from 'types/openapi';

const stateColorMap: Record<SecretState, BadgeColor> = {
    [SecretState.Active]: 'success',
    [SecretState.Inactive]: 'gray',
    [SecretState.Revoked]: 'secondary',
    [SecretState.Expired]: 'transparent',
    [SecretState.Failed]: 'danger',
    [SecretState.PendingApproval]: 'info',
    [SecretState.Rejected]: 'danger',
};

type Props = Readonly<{
    state: SecretState;
    children: React.ReactNode;
}>;

export default function SecretStateBadge({ state, children }: Props) {
    const color = stateColorMap[state] ?? 'secondary';
    const className =
        state === SecretState.Expired ? 'border border-gray-500 dark:border-gray-400 !text-[var(--dark-gray-color)]' : undefined;
    return (
        <Badge color={color} className={className}>
            {children}
        </Badge>
    );
}
