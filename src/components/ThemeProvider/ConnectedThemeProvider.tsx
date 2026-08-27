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

    useEffect(() => {
        dispatch(actions.getPublicBranding());
    }, [dispatch]);

    return <ThemeProvider branding={branding}>{children}</ThemeProvider>;
}

export default ConnectedThemeProvider;
