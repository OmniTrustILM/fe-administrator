import { Component, type ErrorInfo, type ReactNode } from 'react';

export default class CustomAttributeWidgetTestErrorBoundary extends Component<
    { children: ReactNode },
    { error: Error | null; errorInfo: ErrorInfo | null }
> {
    state = { error: null as Error | null, errorInfo: null as ErrorInfo | null };

    static getDerivedStateFromError(error: Error) {
        return { error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.error) {
            return <div data-testid="test-error">{this.state.error.message}</div>;
        }
        return this.props.children;
    }
}
