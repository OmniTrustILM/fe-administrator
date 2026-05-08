import { actions, selectors } from 'ducks/app-redirect';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';

export default function AppRedirect() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const unauthorized = useSelector(selectors.unauthorized);
    const goBack = useSelector(selectors.goBack);
    const redirectUrl = useSelector(selectors.redirectUrl);

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
