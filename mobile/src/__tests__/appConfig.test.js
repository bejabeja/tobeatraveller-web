const loadConfig = (env) => {
  const saved = { ...process.env };
  Object.assign(process.env, env);
  try {
    let config;
    jest.isolateModules(() => { config = require('../../app.config.js')({ config: {} }); });
    return config;
  } finally {
    process.env = saved;
  }
};

const PRODUCTION = {
  EAS_BUILD_PROFILE: 'production',
  EXPO_PUBLIC_API_URL: 'https://api.tobeatraveller.com',
  EXPO_PUBLIC_WEB_URL: 'https://tobeatraveller.com',
};

describe('app config', () => {
  // Regression: the build for the stores let the app talk plain HTTP, which is only needed for
  // the API on the local network while developing.
  it('lets only builds for developing talk plain HTTP', () => {
    expect(loadConfig(PRODUCTION).android.usesCleartextTraffic).toBe(false);
    expect(loadConfig({ EAS_BUILD_PROFILE: 'development' }).android.usesCleartextTraffic).toBe(true);
  });

  // Regression-in-waiting: without them the build was made anyway, talking to localhost.
  it('refuses to make a build for the stores without the address of the API or of the web', () => {
    expect(() => loadConfig({ ...PRODUCTION, EXPO_PUBLIC_API_URL: '' })).toThrow('EXPO_PUBLIC_API_URL');
    expect(() => loadConfig({ ...PRODUCTION, EXPO_PUBLIC_WEB_URL: '' })).toThrow('EXPO_PUBLIC_WEB_URL');
  });

  it('takes the addresses it is given', () => {
    expect(loadConfig(PRODUCTION).extra).toMatchObject({ apiUrl: 'https://api.tobeatraveller.com', webUrl: 'https://tobeatraveller.com' });
  });
});
