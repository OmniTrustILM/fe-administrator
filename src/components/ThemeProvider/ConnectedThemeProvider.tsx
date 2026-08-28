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
    // ThemeProvider would look like a live "not branded" answer, clearing the cached operator default and dropping a
    // branded instance to the platform pair. Withholding it instead leaves the cache — and the branded modes — intact.
    return <ThemeProvider branding={readFailed ? undefined : branding}>{children}</ThemeProvider>;
}

export default ConnectedThemeProvider;
