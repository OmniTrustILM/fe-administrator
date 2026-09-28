import { type ReactNode, useEffect, useRef } from 'react';

type Props = Readonly<{
    id: string;
    title: string;
    /** Moves focus to the title as the section is shown, for a section that replaces the one the user was in. */
    focusTitle?: boolean;
    children: ReactNode;
}>;

export default function WizardSection({ id, title, focusTitle = false, children }: Props) {
    const titleRef = useRef<HTMLHeadingElement>(null);

    useEffect(() => {
        if (focusTitle) titleRef.current?.focus();
    }, [focusTitle]);

    return (
        <section aria-labelledby={id} className="space-y-3">
            <h4
                ref={titleRef}
                id={id}
                tabIndex={focusTitle ? -1 : undefined}
                className="text-xs font-semibold uppercase tracking-wide text-content-muted"
            >
                {title}
            </h4>
            {children}
        </section>
    );
}
