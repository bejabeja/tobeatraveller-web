import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useRef } from "react";
import { MdOutlineFilterCenterFocus } from "react-icons/md";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import "./Map.scss";

const createNumberedIcon = (number, highlighted = false) =>
  L.divIcon({
    className: "",
    html: highlighted
      ? `<div style="width:32px;height:32px;background:#fff;color:#0077b6;border:2.5px solid #0077b6;border-radius:50%;box-shadow:0 0 0 4px rgba(0,119,182,0.2),0 2px 8px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;font-family:inherit;line-height:1;transition:all 0.15s;">${number}</div>`
      : `<div style="width:26px;height:26px;background:#0077b6;color:#fff;border:2.5px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;font-family:inherit;line-height:1;">${number}</div>`,
    iconSize: highlighted ? [32, 32] : [26, 26],
    iconAnchor: highlighted ? [16, 16] : [13, 13],
    popupAnchor: [0, -16],
  });

const createLocationIcon = () =>
  L.divIcon({
    className: "",
    html: `<div style="font-size:1.4rem;line-height:1;">📍</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });

const MapController = ({ coords, coordsByIndex, resetRef, panToRef }) => {
  const map = useMap();

  const reset = useCallback(() => {
    if (coords.length === 0) return;
    if (coords.length === 1) {
      map.setView(coords[0], 13, { animate: true });
    } else {
      map.fitBounds(L.latLngBounds(coords), { padding: [36, 36], maxZoom: 14, animate: true });
    }
  }, [coords, map]);

  useEffect(() => { resetRef.current = reset; }, [reset, resetRef]);
  useEffect(() => { reset(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!panToRef) return;
    panToRef.current = (index) => {
      const coord = coordsByIndex?.[index];
      if (!coord) return;
      map.setView(coord, Math.max(map.getZoom(), 14), { animate: true });
    };
  }, [coordsByIndex, map, panToRef]);

  return null;
};

const Map = ({ location, places = [], hoveredPlaceIndex = null, panToRef = null }) => {
  const resetRef = useRef(null);

  if (!location?.lat || !location?.lon) {
    return <p className="map__error">No map available</p>;
  }

  const center = [parseFloat(location.lat), parseFloat(location.lon)];

  const placeMarkers = places
    .map((p, originalIndex) => ({
      lat: parseFloat(p.latitude),
      lng: parseFloat(p.longitude),
      name: p.name,
      originalIndex,
      number: originalIndex + 1,
    }))
    .filter((m) => m.lat && m.lng);

  // indexed by originalIndex so panTo(index) always resolves correctly
  const coordsByIndex = places.map((p) =>
    p.latitude && p.longitude ? [parseFloat(p.latitude), parseFloat(p.longitude)] : null
  );

  const fitCoords =
    placeMarkers.length > 0 ? placeMarkers.map((m) => [m.lat, m.lng]) : [center];

  const routeCoords = placeMarkers.map((m) => [m.lat, m.lng]);

  return (
    <div className="map">
      <MapContainer center={center} zoom={12} className="map__container">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {routeCoords.length > 1 && (
          <Polyline
            positions={routeCoords}
            pathOptions={{ color: "#0077b6", weight: 1.5, opacity: 0.5 }}
          />
        )}

        {placeMarkers.length > 0 ? (
          placeMarkers.map((m) => (
            <Marker
              key={m.number}
              position={[m.lat, m.lng]}
              icon={createNumberedIcon(m.number, hoveredPlaceIndex === m.originalIndex)}
            >
              <Popup><strong>{m.number}. {m.name}</strong></Popup>
            </Marker>
          ))
        ) : (
          <Marker position={center} icon={createLocationIcon()}>
            <Popup>{location.name}</Popup>
          </Marker>
        )}

        <MapController coords={fitCoords} coordsByIndex={coordsByIndex} resetRef={resetRef} panToRef={panToRef} />
      </MapContainer>

      <button
        className="map__reset-btn"
        onClick={() => resetRef.current?.()}
        title="Reset view"
      >
        <MdOutlineFilterCenterFocus />
      </button>
    </div>
  );
};

export default Map;
