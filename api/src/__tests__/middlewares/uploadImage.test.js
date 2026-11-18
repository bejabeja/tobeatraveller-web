import { describe, expect, it, vi } from 'vitest';
import { imageFileFilter } from '../../middlewares/uploadImage.js';
import { ValidationError } from '../../errors/ValidationError.js';

const filter = (mimetype) => {
    const done = vi.fn();
    imageFileFilter({}, { mimetype }, done);
    return done.mock.calls[0];
};

describe('imageFileFilter', () => {
    it.each(['image/jpeg', 'image/png', 'image/webp', 'image/heic'])('takes a photo sent as %s', (mimetype) => {
        expect(filter(mimetype)).toEqual([null, true]);
    });

    it('turns away a file that is not an image', () => {
        expect(filter('application/pdf')[0]).toBeInstanceOf(ValidationError);
    });

    // Regression: an SVG is an image to the browser but can carry a script, and the photos
    // are shown back to every visitor.
    it.each(['image/svg+xml', 'image/SVG+XML', 'image/svg+xml; charset=utf-8'])('turns away an SVG sent as %s', (mimetype) => {
        expect(filter(mimetype)[0]).toBeInstanceOf(ValidationError);
    });
});
