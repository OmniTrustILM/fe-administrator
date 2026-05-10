import { useEffect, useRef, useCallback } from 'react';
import SimpleBarOriginal from 'simplebar-react';

type Props = React.ComponentProps<typeof SimpleBarOriginal> & {
    children: React.ReactNode;
};

function SimpleBar({ children, ...props }: Readonly<Props>) {
    const simpleBarRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const setSimpleBarRef = useCallback((node: any) => {
        simpleBarRef.current = node;
    }, []);

    useEffect(() => {
        if (!containerRef.current || !simpleBarRef.current) return;

        const resizeObserver = new ResizeObserver(() => {
            if (simpleBarRef.current?.recalculate) {
                simpleBarRef.current.recalculate();
            }
        });

        resizeObserver.observe(containerRef.current);

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    return (
        <div ref={containerRef} style={{ width: 'inherit', height: 'inherit', minWidth: 0, minHeight: 0 }}>
            <SimpleBarOriginal ref={setSimpleBarRef} {...props}>
                {children}
            </SimpleBarOriginal>
        </div>
    );
}

export default SimpleBar;
