import { actions as filterActions } from 'ducks/filters';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router';

/**
 * Reports every route change, so a list's filters survive a visit to one of its own detail pages and are
 * dropped the moment the user goes anywhere else. Mounted once, inside the router.
 */
export default function ListReturnTracker() {
    const dispatch = useDispatch();
    const { pathname } = useLocation();

    useEffect(() => {
        dispatch(filterActions.routeChanged({ pathname }));
    }, [dispatch, pathname]);

    return null;
}
