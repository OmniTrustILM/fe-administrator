import { type ReactNode, useEffect, useRef } from 'react';

export type PopoverPlacement = 'top' | 'bottom' | 'left' | 'right' | 'auto';

type Props = {
    content: string | ReactNode;
    children: ReactNode;
    title?: string;
    width?: number;
};

function Popover({ content, children, title, width = 300 }: Readonly<Props>) {
    const contentRef = useRef<HTMLDivElement>(null);
    const toggleRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!contentRef.current || !toggleRef.current) return;

        const handleClick = (event: MouseEvent) => {
            const target = event.target as Node;
            if (contentRef.current?.contains(target)) {
                event.stopImmediatePropagation();
                event.preventDefault();
            }
        };

        const content = contentRef.current;

        content.addEventListener('click', handleClick, true);
        content.addEventListener('mousedown', handleClick, true);
        document.addEventListener('click', handleClick, true);

        return () => {
            content.removeEventListener('click', handleClick, true);
            content.removeEventListener('mousedown', handleClick, true);
            document.removeEventListener('click', handleClick, true);
        };
    }, []);

    return (
        <div className="hs-tooltip [--trigger:click] inline-block">
            <div
                ref={toggleRef}
                role="button"
                tabIndex={0}
                aria-haspopup="dialog"
                className="hs-tooltip-toggle block text-center"
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        (e.currentTarget as HTMLElement).click();
                    }
                }}
            >
                {children}
                <div
                    ref={contentRef}
                    className="!bg-[#F7F6F2] px-5 py-4 hs-tooltip-content hs-tooltip-shown:opacity-100 hs-tooltip-shown:visible hidden opacity-0 transition-opacity absolute invisible z-10 bg-white border border-gray-100 text-start rounded-lg shadow-md dark:bg-neutral-800 dark:border-neutral-700"
                    style={width ? { width: `${width}px` } : undefined}
                    role="tooltip"
                >
                    {title && <div className="text-lg font-bold mb-2">{title}</div>}
                    {content}
                </div>
            </div>
        </div>
    );
}

export default Popover;
