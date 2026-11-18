jest.mock('react-native-webview', () => ({ WebView: () => null }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }));
jest.mock('../../utils/styles', () => ({ COLORS: {}, shadow: () => ({}) }));

import { buildMapHTML } from '../../components/WorldMapSection';

const scriptsIn = (html) => html.match(/<script>/g) ?? [];

describe('buildMapHTML', () => {
  // Regression: the destinations went into the page's <script> as they were, and their names
  // come from the trips people publish, so a name with "</script>" in it ran its own script
  // in the map of everyone who opened the app.
  it('keeps a destination name from ending the map script and running its own', () => {
    const html = buildMapHTML([{ name: '</script><script>alert(1)</script>', lat: 40, lon: -3, count: 1 }]);

    expect(html).not.toContain('<script>alert');
    expect(scriptsIn(html)).toHaveLength(1);
  });

  it('still hands the map each destination with its name as it is', () => {
    const html = buildMapHTML([{ name: 'Lisboa <centro>', lat: 38.72, lon: -9.14, count: 3 }]);
    const data = html.match(/(\[\{.*\}\])\.forEach/)[1];

    expect(JSON.parse(data)).toEqual([{ name: 'Lisboa <centro>', lat: 38.72, lon: -9.14, count: 3 }]);
  });
});
