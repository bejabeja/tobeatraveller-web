import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import en from '../../locales/en.json';
import es from '../../locales/es.json';
import fr from '../../locales/fr.json';
import it_ from '../../locales/it.json';
import de from '../../locales/de.json';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const SOURCE_ROOTS = ['client/src', 'mobile/src'];
const PLURAL_SUFFIXES = ['_one', '_other'];
// t('namespace.key'): only literal keys can be checked; template-literal keys
// built at runtime (t(`vanLog.category.${value}`)) are out of reach here.
const STATIC_KEY_PATTERN = /\bt\(\s*['"]([a-zA-Z]\w*\.[\w.]+)['"]/g;

const flattenKeys = (node, prefix = '') => Object.entries(node).flatMap(([key, value]) => {
  const path = prefix ? `${prefix}.${key}` : key;
  return value && typeof value === 'object' && !Array.isArray(value) ? flattenKeys(value, path) : [path];
});

const hasKey = (locale, key) => {
  const parts = key.split('.');
  const leaf = parts.pop();
  const parent = parts.reduce((node, part) => node?.[part], locale);
  if (!parent || typeof parent !== 'object') return false;
  return leaf in parent || PLURAL_SUFFIXES.some(suffix => `${leaf}${suffix}` in parent);
};

const sourceFiles = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sourceFiles(path);
  return /\.jsx?$/.test(name) ? [path] : [];
});

const staticKeysInUse = () => {
  const usages = new Map();
  SOURCE_ROOTS.flatMap(root => sourceFiles(join(REPO_ROOT, root))).forEach((file) => {
    for (const [, key] of readFileSync(file, 'utf8').matchAll(STATIC_KEY_PATTERN)) {
      if (!usages.has(key)) usages.set(key, file.replace(`${REPO_ROOT}/`, ''));
    }
  });
  return usages;
};

const TRANSLATIONS = [['es', es], ['fr', fr], ['it', it_], ['de', de]];

// English's keys, plus a "_many" form of each plural where the language has
// one (Spanish, French and Italian, for a million and up; not German): without it
// i18next shows the raw key.
const expectedKeys = (language) => {
  const keys = flattenKeys(en);
  const hasMany = new Intl.PluralRules(language).resolvedOptions().pluralCategories.includes('many');
  const manyForms = hasMany ? keys.filter(key => key.endsWith('_other')).map(key => key.replace(/_other$/, '_many')) : [];
  return [...keys, ...manyForms].sort();
};

describe('locales', () => {
  it.each(TRANSLATIONS)('has the same keys in %s as in English', (language, locale) => {
    expect(flattenKeys(locale).sort()).toEqual(expectedKeys(language));
  });

  // Regression: vanLog.viewBreakdown and nav.settings were used by the apps
  // but missing from both locales, so the raw key showed up on screen.
  it.each([['en', en], ...TRANSLATIONS])('defines every static key the web and mobile apps use (%s)', (_, locale) => {
    const missing = [...staticKeysInUse()]
      .filter(([key]) => !hasKey(locale, key))
      .map(([key, file]) => `${key} (${file})`);

    expect(missing).toEqual([]);
  });
});
