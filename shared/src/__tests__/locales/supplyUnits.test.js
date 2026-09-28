import { describe, expect, it } from 'vitest';
import i18next from 'i18next';
import es from '../../locales/es.json';
import en from '../../locales/en.json';
import de from '../../locales/de.json';

const i18n = i18next.createInstance();
await i18n.init({ lng: 'es', resources: { es: { translation: es }, en: { translation: en }, de: { translation: de } } });

const unit = (lng, value, count) => i18n.t(`supplies.unit.${value}`, { lng, count, defaultValue: value });

// Regression: the lists read "1 unidades", "1 paquetes": the unit was
// always given in the plural, whatever the amount.
describe('supply units agree with the amount', () => {
    it('gives one of something in the singular and more in the plural', () => {
        expect(unit('es', 'units', 1)).toBe('unidad');
        expect(unit('es', 'units', 2)).toBe('unidades');
        expect(unit('en', 'packs', 1)).toBe('pack');
        expect(unit('de', 'cans', 3)).toBe('Dosen');
    });

    it('leaves units of measure as they are', () => {
        expect(unit('es', 'kg', 1)).toBe('kg');
        expect(unit('es', 'l', 1.5)).toBe('l');
    });
});
