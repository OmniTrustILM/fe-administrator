export function jsxInnerText(obj: React.ReactNode): string {
    let buf = '';

    if (obj !== null && obj !== undefined) {
        const type = typeof obj;

        if (type === 'string' || type === 'number' || type === 'boolean') {
            buf += obj.toString();
        } else if (type === 'object') {
            let children = null;

            if (Array.isArray(obj)) {
                children = obj;
            } else {
                const props = obj.props;

                if (props) {
                    children = props.children;
                }
            }

            if (children) {
                if (Array.isArray(children)) {
                    children.forEach((o) => {
                        buf += jsxInnerText(o);
                    });
                } else {
                    buf += jsxInnerText(children);
                }
            } else {
                if (props)
                    Object.getOwnPropertyNames(props).forEach((propName) => {
                        buf += propName;
                        buf += jsxInnerText(props[propName]);
                    });
            }
        }
    }

    return buf;
}
