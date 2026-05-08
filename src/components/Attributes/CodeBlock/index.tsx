import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';
import parse from 'html-react-parser';
import { useDispatch } from 'react-redux';
import Button from 'components/Button';
import { actions } from 'ducks/user-interface';
import { Info } from 'lucide-react';
import { base64ToUtf8 } from 'utils/common-utils';
import type { CodeBlockAttributeContentModel } from '../../../types/attributes';
import type { ProgrammingLanguageEnum } from '../../../types/openapi';

type Props = Readonly<{
    content: CodeBlockAttributeContentModel;
}>;

export const getHighLightedCode = (code: string, language: ProgrammingLanguageEnum) => {
    try {
        return hljs.highlight(code ?? '', { language }).value;
    } catch (e) {
        console.error(e);
        return code;
    }
};

export default function CodeBlock({ content }: Props) {
    const dispatch = useDispatch();

    const handleOpenDialog = () => {
        dispatch(
            actions.showGlobalModal({
                title: `${content.data.language} code block`,
                content: (
                    <pre className="overflow-y-auto max-h-[60vh] py-2">
                        <code
                            className={`language-${content.data.language}`}
                            style={{
                                fontFamily: '"Fira code", "Fira Mono", monospace',
                            }}
                        >
                            {parse(
                                DOMPurify.sanitize(
                                    getHighLightedCode(
                                        content.data.code == null ? '' : base64ToUtf8(content.data.code),
                                        content.data.language,
                                    ),
                                ),
                            )}
                        </code>
                    </pre>
                ),
                size: 'xl',
                showCloseButton: true,
                isOpen: true,
            }),
        );
    };

    return (
        <span data-testid="code-block">
            {content.data.language}&nbsp;
            <Button
                variant="transparent"
                title="View code"
                className="!p-1 relative ml-1 top-[3px]"
                onClick={handleOpenDialog}
                data-testid="code-block-open-btn"
            >
                <Info size={14} />
            </Button>
        </span>
    );
}
