import { actions, selectors } from 'ducks/app-redirect';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router';

export default function AppRedirect() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { pathname } = useLocation();

    const unauthorized = useSelector(selectors.unauthorized);
    const goBack = useSelector(selectors.goBack);
    const redirectUrl = useSelector(selectors.redirectUrl);

    // Preline components (Select, Popover, Pagination tooltips, Dialog overlay, ...) require
    // HSStaticMethods.autoInit() to be called after they mount. Run it on every route change
    // to cover newly rendered Preline-backed UI on each page.
    useEffect(() => {
        (globalThis as any).HSStaticMethods?.autoInit();
    }, [pathname]);

    useEffect(() => {
        if (!goBack) return;
        dispatch(actions.clearGoBack());
        navigate(-1);
    }, [dispatch, goBack, navigate]);

    useEffect(() => {
        if (!unauthorized) return;
        dispatch(actions.clearUnauthorized());

        const url = globalThis.location.toString().substring(globalThis.location.origin.length);
        if (!url.includes('#/login?redirect=')) {
            const redirect = encodeURIComponent(url);
            navigate(`/login?redirect=${redirect}`);
        }
    }, [dispatch, navigate, unauthorized]);

    useEffect(() => {
        if (!redirectUrl) return;
        dispatch(actions.clearRedirectUrl());
        navigate(redirectUrl, { relative: 'path' });
    }, [dispatch, navigate, redirectUrl]);

    return null;
}
