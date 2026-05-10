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
                    href="https://docs.czertainly.com/docs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600"
                    data-testid="footer-docs-link"
                >
                    Documentation
                </a>
                <span className="mx-2">·</span>
                <a
                    href="https://czertainly.atlassian.net/servicedesk/customer/portal/1"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600"
                    data-testid="footer-support-link"
                >
                    Support
                </a>
                <span className="mx-2">·</span>
                <a
                    href="https://www.czertainly.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600"
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
