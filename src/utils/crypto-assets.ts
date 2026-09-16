import type { BadgeColor } from 'components/Badge';
import { PqcVerdict } from 'types/openapi';

// `unknown` is amber, not neutral: the rule set could not classify the asset, which is a call to fix the producer's data.
// A verdict this build does not know takes the same amber, so a value core adds later never reads as settled.
export function getPqcVerdictBadgeColor(verdict: PqcVerdict): BadgeColor {
    switch (verdict) {
        case PqcVerdict.Ready:
            return 'success';

        case PqcVerdict.NotReady:
            return 'danger';

        case PqcVerdict.NotApplicable:
            return 'secondary';

        default:
            return 'warning';
    }
}

// The `-solid` tokens are indicator colours: safe for a dot, not for text, so the badge body never wears them.
export function getPqcVerdictDotClass(verdict: PqcVerdict): string {
    switch (verdict) {
        case PqcVerdict.Ready:
            return 'bg-success-solid';

        case PqcVerdict.NotReady:
            return 'bg-danger-solid';

        case PqcVerdict.NotApplicable:
            return 'bg-outline';

        default:
            return 'bg-warning-solid';
    }
}
