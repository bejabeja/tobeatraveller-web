// An experience step keeps the traveller's own note inside its description
// (places have no field of their own for it), after this separator.
const STEP_NOTE_SEPARATOR = '\n\n✍️ ';

export const joinStepNote = (description, personalNote) => {
    const note = personalNote?.trim();
    return note ? `${description}${STEP_NOTE_SEPARATOR}${note}` : description;
};

export const splitStepNote = (raw) => {
    const text = raw ?? '';
    const index = text.indexOf(STEP_NOTE_SEPARATOR);
    if (index === -1) return { description: text, personalNote: '' };
    return { description: text.slice(0, index), personalNote: text.slice(index + STEP_NOTE_SEPARATOR.length) };
};
