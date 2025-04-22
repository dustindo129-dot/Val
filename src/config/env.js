/**
 * Environment Configuration
 * 
 * Central place to configure environment-specific settings
 * including feature flags and service configurations.
 */

const environment = {
  // Feature flags
  features: {
    // Only bunny.net is supported now
    activeCdn: 'bunny',
  },
  
  // CDN configuration
  cdnSettings: {
    // bunny.net settings
    bunny: {
      baseUrl: 'https://valvrareteam.b-cdn.net',
      storageUrl: 'https://sg.storage.bunnycdn.com/valvrareteam',
    }
  },
  
  // Helper functions
  isFeatureEnabled: (featureName) => {
    return environment.features[featureName] === true;
  },
  
  // Get active CDN - always returns 'bunny' now
  getActiveCdn: () => {
    return 'bunny';
  },
  
  // Toggle debugging 
  debug: {
    logCdnOperations: false, // Turn off CDN operation logging since we're only using bunny now
  }
};

export default environment; 