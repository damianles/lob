/**
 * Parse Google Place Details `address_components` into LOB fields.
 * @see https://developers.google.com/maps/documentation/places/web-service/place-details
 */
export type ParsedPlace = {
  /** Street line when available (number + route). */
  line1: string;
  city: string;
  state: string;
  /** Postal or ZIP */
  zip: string;
  country: string;
  /** Short ISO country code when present, e.g. US, CA */
  countryCode: string;
  formattedAddress: string;
  placeId: string;
};

type Component = { long_name: string; short_name: string; types: string[] };

function hasType(c: Component, t: string) {
  return c.types.includes(t);
}

export function parseAddressComponents(components: Component[], formattedAddress: string, placeId: string): ParsedPlace {
  let streetNumber = "";
  let route = "";
  let city = "";
  let state = "";
  let zip = "";
  let country = "";
  let countryCode = "";

  for (const c of components) {
    if (hasType(c, "street_number")) streetNumber = c.long_name;
    if (hasType(c, "route")) route = c.long_name;
    if (hasType(c, "locality")) city = c.long_name;
    if (hasType(c, "postal_town") && !city) city = c.long_name; // UK etc.
    if (hasType(c, "sublocality") && !city) city = c.long_name; // some regions
    if (hasType(c, "administrative_area_level_1")) state = c.short_name || c.long_name;
    if (hasType(c, "postal_code")) zip = c.long_name;
    if (hasType(c, "country")) {
      country = c.long_name;
      countryCode = c.short_name?.toUpperCase() || "";
    }
  }

  const line1 = [streetNumber, route].filter(Boolean).join(" ").trim();

  if (!city) {
    // Neighbourhood / CDP fallbacks
    for (const c of components) {
      if (hasType(c, "neighborhood") || hasType(c, "administrative_area_level_2")) {
        if (!city) city = c.long_name;
        break;
      }
    }
  }

  return {
    line1,
    city: city || "",
    state: state || "",
    zip: zip || "",
    country: country || "",
    countryCode: countryCode || "",
    formattedAddress,
    placeId,
  };
}
