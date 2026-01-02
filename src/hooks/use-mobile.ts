import * as React from 'react';

const MOBILE_QUERY = "(max-width: 768px)";

export function useIsMobile() {
    const [isMobile, setIsMobile] = React.useState(false);

    React.useEffect(() => {
        const mediaQuery = window.matchMedia(MOBILE_QUERY);
        setIsMobile(mediaQuery.matches);

        const handler = () => setIsMobile(mediaQuery.matches);
        mediaQuery.addEventListener('change', handler);

        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    return isMobile;
}
