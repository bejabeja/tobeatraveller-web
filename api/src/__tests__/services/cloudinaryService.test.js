import { describe, expect, it, vi } from 'vitest';

const uploadStream = vi.hoisted(() => vi.fn((options, done) => ({ end: () => done(null, { secure_url: 'https://cdn.test/a.jpg' }) })));
vi.mock('cloudinary', () => ({ v2: { config: vi.fn(), uploader: { upload_stream: uploadStream, destroy: vi.fn() } } }));

import { CloudinaryService } from '../../services/cloudinaryService.js';

describe('CloudinaryService.uploadImageFromBuffer()', () => {
    // Regression: the type of a file is what the browser says it is, so an SVG sent as a PNG got
    // past the upload's check; the formats are now held to by what the file really is.
    it('only takes photo formats, and never an SVG, whatever the file says it is', async () => {
        await new CloudinaryService().uploadImageFromBuffer(Buffer.from('x'), 'avatars');

        const [options] = uploadStream.mock.calls[0];
        expect(options).toMatchObject({ resource_type: 'image', folder: 'avatars' });
        expect(options.allowed_formats).toEqual(expect.arrayContaining(['jpg', 'png', 'webp', 'heic']));
        expect(options.allowed_formats).not.toContain('svg');
    });
});
