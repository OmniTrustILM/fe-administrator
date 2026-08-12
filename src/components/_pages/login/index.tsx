import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { actions, selectors } from 'ducks/login';
import Button from 'components/Button';
import { loginRedirect } from 'utils/login-redirect';

export default function Login() {
    const dispatch = useDispatch();
    const [searchParams] = useSearchParams();

    const loginMethods = useSelector(selectors.loginMethods);
    const isLoading = useSelector(selectors.isFetching);
    const error = useSelector(selectors.error);
    const redirect = searchParams.get('redirect');

    useEffect(() => {
        dispatch(actions.getLoginMethods({ redirect: redirect || undefined }));
    }, [dispatch, redirect]);

    const capitalizeFirst = (str: string) => {
        return str.charAt(0).toUpperCase() + str.slice(1);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-surface px-4 py-12">
            <main className="max-w-md w-full">
                <div className="flex justify-center mb-8">
                    <img src="./logo.svg" alt="ILM Logo" className="h-13" />
                </div>

                <h1 className="text-xl font-bold mt-8 mb-9 text-center text-content">Login with</h1>

                {(() => {
                    if (isLoading) {
                        return (
                            <div className="text-center py-8">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-content"></div>
                                <p className="mt-4 text-content-muted">Loading login options...</p>
                            </div>
                        );
                    }
                    if (error) {
                        return (
                            <div className="text-center py-8">
                                <p className="text-danger">{error}</p>
                            </div>
                        );
                    }
                    if (!loginMethods || loginMethods.length === 0) {
                        return (
                            <div className="text-center py-8">
                                <p className="text-content-muted">No login methods available</p>
                            </div>
                        );
                    }
                    return (
                        <ul className="flex flex-wrap -mx-2.5 w-full">
                            {(loginMethods || []).map((method) => (
                                <li key={method.name} className="w-1/2 p-2.5">
                                    <Button
                                        onClick={() => loginRedirect(method.loginUrl, redirect)}
                                        variant="outline"
                                        color="lightGray"
                                        className="w-full capitalize !text-base font-semibold justify-center"
                                    >
                                        {capitalizeFirst(method.name)}
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    );
                })()}
            </main>
        </div>
    );
}
