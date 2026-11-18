import type { ReactNode } from 'react';

type Props = {
    legend: string;
    description: string;
    children: ReactNode;
};

export default function FormSection({ legend, description, children }: Readonly<Props>) {
    return (
        <fieldset className="space-y-4 border-t border-divider pt-4">
            <legend className="text-base font-semibold text-content">{legend}</legend>
            <p className="text-sm text-content-subtle">{description}</p>
            {children}
        </fieldset>
    );
}
