import { useEffect, type ReactNode } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { actions, selectors } from 'ducks/branding';
import ThemeProvider from './index';

type Props = {
    children: ReactNode;
};

/**
 * Feeds the operator's branding into {@link ThemeProvider}. The read is the anonymous one, because the theme has to be
 * resolved on the login page too, before there is any session. ThemeProvider itself stays store-free so that a
 * component test can mount it on its own.
 */
function ConnectedThemeProvider({ children }: Readonly<Props>) {
    const dispatch = useDispatch();
    const branding = useSelector(selectors.publicBranding);
    const readFailed = useSelector(selectors.publicBrandingReadFailed);

    useEffect(() => {
        dispatch(actions.getPublicBranding());
    }, [dispatch]);

    // A failed read still settles the store on the platform default so the login page can render. Handing that to
    // ThemeProvider would look like a live "not branded" answer and clear the cached operator default, so a returning
    // user on a branded instance would lose the operator's theme to a transient network error. Withholding it instead
    // leaves the cache intact.
    return <ThemeProvider branding={readFailed ? undefined : branding}>{children}</ThemeProvider>;
}

export default ConnectedThemeProvider;
