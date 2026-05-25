import * as React from 'react';
import CodeEditor from './CodeEditor';

type HarnessProps = {
    initial?: string;
    onValueChange?: (v: string) => void;
    onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>;
    ignoreTabKey?: boolean;
    insertSpaces?: boolean;
    tabSize?: number;
    disabled?: boolean;
    readOnly?: boolean;
    required?: boolean;
    placeholder?: string;
    maxLength?: number;
    minLength?: number;
    textareaId?: string;
    textareaClassName?: string;
    preClassName?: string;
    padding?: number | { top?: number; right?: number; bottom?: number; left?: number };
    highlightAs?: 'string' | 'node';
    name?: string;
    autoFocus?: boolean;
};

export function Harness({ initial = '', highlightAs = 'string', onValueChange, ...rest }: Readonly<HarnessProps>) {
    const [value, setValue] = React.useState(initial);
    const highlight = (v: string) => (highlightAs === 'node' ? <span data-testid="rn-highlight">{v}</span> : `<em>${v}</em>`);
    return (
        <CodeEditor
            {...(rest as React.ComponentProps<typeof CodeEditor>)}
            value={value}
            onValueChange={(v) => {
                setValue(v);
                onValueChange?.(v);
            }}
            highlight={highlight}
        />
    );
}

type CodeEditorHandle = React.ComponentRef<typeof CodeEditor>;

export function SessionRefProbe() {
    const ref = React.useRef<CodeEditorHandle | null>(null);
    const [info, setInfo] = React.useState('');
    React.useEffect(() => {
        const s = ref.current;
        if (s) {
            setInfo(`stack:${s.session.history.stack.length},offset:${s.session.history.offset}`);
        }
    }, []);
    return (
        <>
            <div data-testid="ref-info">{info}</div>
            <CodeEditor ref={ref} value="abc" onValueChange={() => {}} highlight={(v) => v} />
        </>
    );
}
