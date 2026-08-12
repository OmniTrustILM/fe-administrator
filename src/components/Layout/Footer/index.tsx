import cn from 'classnames';

import PlatformInfoDialogButton from 'components/Layout/PlatformInfoDialogButton';

type Props = {
    className?: string;
};

function Footer({ className }: Readonly<Props>) {
    return (
        <footer className={cn('py-4 pt-12', className)} data-testid="footer">
            <div className="text-sm font-semibold">
                <span>© 2018-{new Date().getFullYear()} &nbsp;Identity Lifecycle Management </span>
                <span className="mx-2">·</span>
                <a
                    href="https://docs.otilm.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand"
                    data-testid="footer-docs-link"
                >
                    Documentation
                </a>
                <span className="mx-2">·</span>
                <a href="mailto:ilm@omnitrust.com" className="text-brand" data-testid="footer-support-link">
                    Support
                </a>
                <span className="mx-2">·</span>
                <a
                    href="https://www.omnitrust.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand"
                    data-testid="footer-about-link"
                >
                    About Us
                </a>
                <span className="mx-2">·</span>
                <PlatformInfoDialogButton />
            </div>
        </footer>
    );
}

export default Footer;
