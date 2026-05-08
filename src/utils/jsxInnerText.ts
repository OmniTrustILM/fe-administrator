export function jsxInnerText(obj: React.ReactNode): string {
    if (obj === null || obj === undefined) return '';

    const type = typeof obj;
    if (type === 'string' || type === 'number' || type === 'boolean') {
        return obj.toString();
    }

    if (type !== 'object') return '';

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
