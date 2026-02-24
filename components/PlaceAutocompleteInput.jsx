import { useRef, useEffect } from "react";
import { loadGoogleMaps } from "../lib/googleMaps";

/**
 * Input with Google Places Autocomplete – suggests addresses/places as user types.
 * Props: value, onChange, onPlaceSelect({ formatted, lat, lng }), placeholder, className, id, ...rest
 */
export default function PlaceAutocompleteInput({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Address or place",
  className = "",
  id,
  ...rest
}) {
  const inputRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const onPlaceSelectRef = useRef(onPlaceSelect);
  onChangeRef.current = onChange;
  onPlaceSelectRef.current = onPlaceSelect;

  useEffect(() => {
    if (!inputRef.current) return;
    let cancelled = false;

    loadGoogleMaps()
      .then((maps) => {
        if (!maps?.places || cancelled || !inputRef.current) return;
        const Autocomplete = maps.places.Autocomplete;
        const autocomplete = new Autocomplete(inputRef.current, {
          types: ["geocode", "establishment"],
          fields: ["formatted_address", "geometry", "name"],
        });

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          const addr = place.formatted_address || place.name || inputRef.current?.value || "";
          const location = place.geometry?.location;
          const lat = location?.lat?.();
          const lng = location?.lng?.();

          onChangeRef.current?.(addr);
          if (lat != null && lng != null) {
            onPlaceSelectRef.current?.({ formatted: addr, lat, lng });
          }
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <input
      ref={inputRef}
      type="text"
      autoComplete="off"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      className={className}
      id={id}
      {...rest}
    />
  );
}
