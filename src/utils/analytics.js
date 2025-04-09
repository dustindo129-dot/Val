import ReactGA from 'react-ga4';

// Initialize GA4 with your measurement ID
export const initGA = (measurementId) => {
  ReactGA.initialize(measurementId);
};

// Track page views
export const trackPageView = (path) => {
  ReactGA.send({ hitType: "pageview", page: path });
};

// Track events
export const trackEvent = (category, action, label) => {
  ReactGA.event({
    category,
    action,
    label,
  });
}; 