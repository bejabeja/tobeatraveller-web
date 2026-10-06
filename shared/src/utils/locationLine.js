// "Faro, Portugal" for a place, just "France" when the place is the country itself.
export const locationLine = (location) => {
    const { name, country } = location ?? {};
    if (!name) return null;
    const isCountryItself = country && name.trim().toLowerCase() === country.trim().toLowerCase();
    return country && !isCountryItself ? `${name}, ${country}` : name;
};
