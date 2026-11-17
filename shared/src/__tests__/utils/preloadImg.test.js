import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { preloadImg } from '../../utils/preloadImg.js';

describe('preloadImg', () => {
    let createdImage;

    beforeEach(() => {
        vi.stubGlobal('Image', class {
            constructor() {
                createdImage = this;
            }
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('calls back once the image has loaded', () => {
        const onSettled = vi.fn();

        preloadImg('/images/hero.jpg', onSettled);
        createdImage.onload();

        expect(onSettled).toHaveBeenCalledTimes(1);
    });

    it('calls back too when the image cannot load, so whatever waits for it is not hidden for good', () => {
        const onSettled = vi.fn();

        preloadImg('/images/hero.jpg', onSettled);
        createdImage.onerror();

        expect(onSettled).toHaveBeenCalledTimes(1);
    });
});
