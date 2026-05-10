export function jsxInnerText(obj: React.ReactNode): string {
    if (obj === null || obj === undefined) return '';

    if (typeof obj === 'string') return obj;
    if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);

    if (typeof obj !== 'object') return '';

    if (Array.isArray(obj)) {
        return obj.map(jsxInnerText).join('');
    }

    const props = (obj as { props?: Record<string, React.ReactNode> }).props;
    const children = props?.children;

    if (children) {
        return Array.isArray(children) ? children.map(jsxInnerText).join('') : jsxInnerText(children);
    }

    if (!props) return '';

    return Object.getOwnPropertyNames(props)
        .map((propName) => propName + jsxInnerText(props[propName]))
        .join('');
}
