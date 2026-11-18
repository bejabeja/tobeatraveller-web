import { describe, expect, it } from 'vitest';
import { joinStepNote, splitStepNote } from '../../utils/experienceStepNote.js';

describe('joinStepNote', () => {
    it('adds the personal note after the description', () => {
        expect(joinStepNote('Una playa', 'Fuimos al amanecer')).toBe('Una playa\n\n✍️ Fuimos al amanecer');
    });

    it('leaves the description alone when there is no note', () => {
        expect(joinStepNote('Una playa', '')).toBe('Una playa');
        expect(joinStepNote('Una playa', '   ')).toBe('Una playa');
        expect(joinStepNote('Una playa', undefined)).toBe('Una playa');
    });

    it('trims the note it adds', () => {
        expect(joinStepNote('Una playa', '  Fuimos al amanecer  ')).toBe('Una playa\n\n✍️ Fuimos al amanecer');
    });
});

describe('splitStepNote', () => {
    it('gives back the description and the note that were saved together', () => {
        expect(splitStepNote(joinStepNote('Una playa', 'Fuimos al amanecer')))
            .toEqual({ description: 'Una playa', personalNote: 'Fuimos al amanecer' });
    });

    it('reads a description saved without a note as having none', () => {
        expect(splitStepNote('Una playa')).toEqual({ description: 'Una playa', personalNote: '' });
    });

    it('reads a missing description as empty', () => {
        expect(splitStepNote(undefined)).toEqual({ description: '', personalNote: '' });
        expect(splitStepNote(null)).toEqual({ description: '', personalNote: '' });
    });
});
