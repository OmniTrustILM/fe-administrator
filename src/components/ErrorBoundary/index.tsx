import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import Button from 'components/Button';
import Container from 'components/Container';

type Props = {
    children: ReactNode;
    fallback?: ReactNode;
    resetKey?: string | number;
};

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Readonly<Props>) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            errorInfo: null,
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({
            error,
            errorInfo,
        });
    }

    componentDidUpdate(prevProps: Readonly<Props>) {
        // Reset error state when resetKey changes (e.g., on navigation)
        if (this.props.resetKey !== prevProps.resetKey && this.state.hasError) {
            this.setState({
                hasError: false,
                error: null,
                errorInfo: null,
            });
        }
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <Container
                    className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8"
                    data-testid="error-boundary-fallback"
                >
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
                        </p>
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="mt-4 text-left bg-gray-100 dark:bg-gray-800 p-4 rounded-lg max-w-2xl">
                                <summary className="cursor-pointer font-semibold mb-2">Error Details (Development Only)</summary>
                                <pre className="text-xs overflow-auto">
                                    <div className="mb-2">
                                        <strong>Error:</strong> {this.state.error.toString()}
                                    </div>
                                    {this.state.errorInfo && (
                                        <div>
                                            <strong>Component Stack:</strong>
                                            <pre className="mt-1 whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                                        </div>
                                    )}
                                </pre>
                            </details>
                        )}
                        <div className="mt-6">
                            <Button onClick={this.handleReset} variant="solid" color="primary" data-testid="error-boundary-try-again">
                                Try Again
                            </Button>
                        </div>
                    </div>
                </Container>
            );
        }

        return this.props.children;
    }
}

// Wrapper component that resets error boundary on navigation
function ErrorBoundaryWrapper({ children, fallback }: Readonly<Omit<Props, 'resetKey'>>) {
    const location = useLocation();

    // Use full location (pathname + search + hash) as resetKey
    // This ensures error boundary resets on any navigation, including sidebar navigation
    const resetKey = `${location.pathname}${location.search}${location.hash}`;

    return (
        <ErrorBoundary resetKey={resetKey} fallback={fallback}>
            {children}
        </ErrorBoundary>
    );
}

export default ErrorBoundaryWrapper;
