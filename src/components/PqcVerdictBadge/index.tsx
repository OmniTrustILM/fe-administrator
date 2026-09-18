import cn from 'classnames';
import Badge from 'components/Badge';
import type { PqcVerdict } from 'types/openapi';
import { getPqcVerdictBadgeColor, getPqcVerdictDotClass } from 'utils/crypto-assets';

type Props = {
    verdict: PqcVerdict;
    label: string;
    title?: string;
    dataTestId?: string;
};

// Text stays on Badge's surface fill; the vivid `-solid` indicator colour goes on the dot only.
function PqcVerdictBadge({ verdict, label, title, dataTestId = 'pqc-verdict-badge' }: Readonly<Props>) {
    return (
        <Badge color={getPqcVerdictBadgeColor(verdict)} title={title} dataTestId={dataTestId}>
            <span
                aria-hidden="true"
                data-testid="pqc-verdict-dot"
                className={cn('w-2 h-2 rounded-full shrink-0', getPqcVerdictDotClass(verdict))}
            />
            {label}
        </Badge>
    );
}

export default PqcVerdictBadge;
