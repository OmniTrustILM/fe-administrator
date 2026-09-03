import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectors } from 'ducks/branding';
import { applyBrandTokens, brandColors, brandTokenCss, storeBrandCss } from 'utils/brand-tokens';

/**
 * Applies the operator's brand colours as an override over the semantic colour tokens, and caches the result for the
 * next load's first paint.
 *
 * Renders nothing: branding reaches components through the token layer, so no component has to know the instance is
 * branded. The read is the anonymous one - the same response the theme is resolved from - and is issued by
 * `ConnectedThemeProvider`, which mounts this, rather than here as well.
 *
 * The two cases that must *not* clear what is applied are the reason this is not simply a call in a render:
 *
 * - before the first response, `publicBranding` is undefined, and the pre-paint script has already applied the cached
 *   stylesheet. Clearing it here would flash the platform palette on every load, which is the one thing the cache
 *   exists to prevent;
 * - a failed read settles the slice on the platform default so the login page can still render. Treating that as a
 *   live "not branded" answer would drop the operator's colours - and the cache with them - on a transient network
 *   error, so the previous load's colours are left in place instead.
 */
function BrandTokens() {
    const branding = useSelector(selectors.publicBranding);
    const readFailed = useSelector(selectors.publicBrandingReadFailed);

    const live = readFailed ? undefined : branding;
    const css = live ? brandTokenCss(brandColors(live)) : undefined;

    useEffect(() => {
        if (!live) {
            return;
        }

        // A live response with no colours in it is an instance that is genuinely unbranded, so the stylesheet is
        // removed and the cache cleared: that is how unbranding an instance takes effect for a returning user.
        applyBrandTokens(css);
        storeBrandCss(css);
    }, [live, css]);

    return null;
}

export default BrandTokens;
