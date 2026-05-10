import type React from 'react';
import Button from 'components/Button';
import type { LegendItem } from '..';
import { Rocket, Book, Filter, Zap, Settings, FileText, Award, User, KeyRound, Users, CreditCard, Stamp, MapPin } from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
    'fa fa-rocket': Rocket,
    'fa fa-book': Book,
    'fa fa-filter': Filter,
    'fa fa-bolt': Zap,
    'fa fa-cogs': Settings,
    'fa fa-certificate': FileText,
    'fa fa-medal': Award,
    'fa fa-user': User,
    'fa fa fa-user': User,
    'fa fa-key': KeyRound,
    'fa fa fa-key': KeyRound,
    'fa fa-users': Users,
    'fa fa fa-users': Users,
    'fa fa-address-card': CreditCard,
    'fa fa fa-address-card': CreditCard,
    'fa fa-stamp': Stamp,
    'fa fa fa-stamp': Stamp,
    'fa fa-map-marker': MapPin,
    'fa fa fa-map-marker': MapPin,
};

interface LegendComponentProps {
    legends: LegendItem[];
}

const LegendComponent: React.FC<LegendComponentProps> = ({ legends }) => {
    if (!legends.length) return null;

    return (
        <div className="flex gap-4 justify-end">
            {legends.map((legend, index) => {
                const IconComponent = iconMap[legend.icon];
                const legendKey = legend.icon || (typeof legend.label === 'string' ? legend.label : `legend-${index}`);
                return (
                    <div key={legendKey} className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="transparent"
                            color="lightGray"
                            onClick={legend.onClick}
                            className="!p-0 !border-none !bg-transparent hover:!bg-transparent focus:!bg-transparent"
                            title={typeof legend.label === 'string' ? legend.label : undefined}
                        >
                            {IconComponent ? <IconComponent size={16} color={legend.color} /> : 'No icon'}
                        </Button>
                        <span>{legend.label}</span>
                    </div>
                );
            })}
        </div>
    );
};

export default LegendComponent;
