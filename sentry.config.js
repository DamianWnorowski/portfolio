// Sentry Configuration for Error Tracking
// Production error monitoring and performance tracking

const SENTRY_DSN = process.env.SENTRY_DSN || '';
const ENVIRONMENT = process.env.NODE_ENV || 'production';
const RELEASE = process.env.VERCEL_GIT_COMMIT_SHA || 'development';

const sentryConfig = {
  dsn: SENTRY_DSN,
  environment: ENVIRONMENT,
  release: RELEASE,
  
  tracesSampleRate: 0.1,
  
  profilesSampleRate: 0.1,
  
  integrations: [
    {
      name: 'BrowserTracing',
      options: {
        tracingOrigins: ['localhost', 'kaizen-elite.vercel.app', /^\//],
        routingInstrumentation: 'default',
      },
    },
    {
      name: 'Replay',
      options: {
        maskAllText: true,
        blockAllMedia: true,
      },
    },
  ],
  
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  beforeSend(event, hint) {
    if (event.exception) {
      const error = hint.originalException;
      
      if (error && error.message) {
        if (error.message.match(/network/i)) {
          event.fingerprint = ['network-error'];
        }
        
        if (error.message.match(/webgl/i)) {
          event.fingerprint = ['webgl-error'];
        }
      }
    }
    
    return event;
  },
  
  ignoreErrors: [
    'Non-Error promise rejection captured',
    'ResizeObserver loop limit exceeded',
    'Script error.',
    'Network request failed',
    /^fetch failed$/i,
  ],
  
  denyUrls: [
    /extensions\//i,
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
  ],
  
  tunnel: '/api/sentry-tunnel',
};

export default sentryConfig;
