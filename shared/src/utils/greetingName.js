// How to address someone: their first name when they gave one, their
// username otherwise. "@ana" reads like a system, "Ana" like a person.
export const greetingName = ({ name, username } = {}) => name?.trim().split(/\s+/)[0] || username || '';
