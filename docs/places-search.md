# Place search (city + address)

LOB uses **Google Places** (Autocomplete + Place Details) behind **signed-in** API routes so the key stays on the server.

## Enable

1. In [Google Cloud Console](https://console.cloud.google.com/), use the same project as your Maps key.
2. Enable **Places API** (legacy) or ensure **Places API (New)** coverage includes Autocomplete/Details for your billing model.
3. Set `GOOGLE_MAPS_API_KEY` in Vercel to a key that allows:
   - Place **Autocomplete**
   - Place **Details** (address components)
4. Redeploy.

Without a key, the post form shows a short note; users can still type locations manually. Built-in **datalists** (your past loads) still work.

## Where it appears

- **Post load** (suppliers): lane row — “Search origin / destination (city)”; first pickup and first delivery — “Search street address”.

## Reuse

Use `<PlaceAutocomplete mode="city" | "address" | "geocode" />` from `src/components/place-autocomplete.tsx` and handle `onResolved` with `ParsedPlace` + lat/lng from the details response.

## Alternatives

- **Mapbox Geocoding** — similar proxy pattern, swap URLs in `app/api/places/*`.
- **No third party** — keep improving `/api/lanes/recent-addresses` + `datalist` (company-scoped only).
