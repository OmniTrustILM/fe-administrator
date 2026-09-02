import { useSelector } from 'react-redux';
import { selectors } from 'ducks/branding';
import { useTheme } from 'components/ThemeProvider';
import { isRenderableLogo } from 'utils/branding';

type Props = {
    /** The platform logo for the light composition, used when the operator has uploaded no light logo. */
    defaultLight: string;
    /** The platform logo for the dark composition. Separate because the surface behind the logo decides, not the theme
     * name: the header carries the brand colour in both themes and wants the same reversed mark, while the login page
     * swaps a coloured mark for a reversed one. */
    defaultDark: string;
    alt: string;
    className?: string;
    dataTestId?: string;
};

/**
 * The application logo: the operator's for the active theme, or the platform's own.
 *
 * The fallback is per slot rather than per brand. An operator who has uploaded only a light logo gets their logo in
 * the light theme and the platform's mark in the dark one, rather than no logo at all - which matters because Core's
 * per-field fallback means a half-uploaded brand can exist even though the Appearance tab will not save one.
 *
 * The logo is always an `img` with the data URI as its `src`, and no code path inlines SVG markup into the document.
 * Core sanitizes an uploaded SVG, and this is the second half of that defence: an `img` renders SVG inert, so a script
 * that survived sanitization still never executes - including for the anonymous visitors on the login page.
 */
function BrandLogo({ defaultLight, defaultDark, alt, className, dataTestId }: Readonly<Props>) {
    const { resolvedTheme } = useTheme();
    const branding = useSelector(selectors.publicBranding);
    const readFailed = useSelector(selectors.publicBrandingReadFailed);

    // A failed read settles the slice on the platform default so the page can still render, which is indistinguishable
    // from a live "not branded" answer. Either way the platform mark is what shows, and no error is put in front of a
    // visitor who cannot act on it.
    const uploaded = readFailed ? undefined : resolvedTheme === 'dark' ? branding?.darkLogo : branding?.lightLogo;
    const platform = resolvedTheme === 'dark' ? defaultDark : defaultLight;

    return (
        <img
            src={isRenderableLogo(uploaded) ? uploaded : platform}
            alt={alt}
            // The height is fixed by the caller and the width follows the image, so anything between 1:1 and 3:1 keeps
            // its proportions; object-contain is what stops a wider mark being stretched to fill.
            className={`w-auto max-w-full object-contain ${className ?? ''}`.trim()}
            data-testid={dataTestId}
        />
    );
}

export default BrandLogo;
