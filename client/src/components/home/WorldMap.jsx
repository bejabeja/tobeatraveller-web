import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { maplibreGL } from "@maplibre/maplibre-gl-leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import { IoLocateOutline } from "react-icons/io5";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { getDestinations, getItinerariesByFilters, getPlacesInBounds } from "../../services/itineraries";
import { getCategoryIcon } from "../../assets/icons";
import { optimizedCloudinaryUrl } from "../../utils/cloudinaryUrl";
import { useCurrentLocation } from "../../hooks/useCurrentLocation";
import "./WorldMap.scss";

setWorkerUrl(maplibreWorkerUrl);

const BASEMAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const BASEMAP_ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> ' +
  '&copy; <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener noreferrer">OpenMapTiles</a> ' +
  'Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>';

// Below this zoom level the map shows city-level aggregated pins (from
// getDestinations); at or above it, city pins are replaced by individual
// itinerary places fetched for the current viewport (getPlacesInBounds).
const PLACES_ZOOM_THRESHOLD = 11;
const USER_LOCATION_ZOOM = 7;

const createDestinationMarker = (count) =>
  L.divIcon({
    className: "",
    html: `<div class="world-map__pin">${count > 99 ? "99+" : count}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

const createPlaceMarker = () =>
  L.divIcon({
    className: "",
    html: `<div class="world-map__place-pin"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

// The OpenMapTiles vector schema carries the local name in `name` and the
// English one in `name_en`; the default style prefers the local name, so
// every label layer using `name` gets forced to `name_en` (falling back to
// `name` when a feature has no English variant).
const forceEnglishLabels = (maplibreMap) => {
  maplibreMap
    .getStyle()
    .layers.filter(
      (layer) =>
        layer.type === "symbol" &&
        JSON.stringify(layer.layout?.["text-field"] ?? "").includes("name")
    )
    .forEach((layer) => {
      maplibreMap.setLayoutProperty(layer.id, "text-field", [
        "coalesce",
        ["get", "name_en"],
        ["get", "name"],
      ]);
    });
};

const EnglishBasemap = () => {
  const map = useMap();

  useEffect(() => {
    const glLayer = maplibreGL({
      style: BASEMAP_STYLE_URL,
      attribution: BASEMAP_ATTRIBUTION,
    }).addTo(map);
    const maplibreMap = glLayer.getMaplibreMap();

    if (maplibreMap.isStyleLoaded()) forceEnglishLabels(maplibreMap);
    else maplibreMap.once("load", () => forceEnglishLabels(maplibreMap));

    return () => map.removeLayer(glLayer);
  }, [map]);

  return null;
};

// Destinations close enough to visually overlap at the current zoom get
// grouped into clusters (transitively: A-close-to-B and B-close-to-C join
// the same cluster even if A and C aren't close enough on their own), then
// spread apart in screen-pixel space (not degrees) around their cluster's
// centroid. The max displacement is a fixed number of pixels regardless of
// zoom, so it never amounts to more than a short on-screen nudge - a
// degree-based offset used to represent a wildly different real-world
// distance depending on zoom, enough to displace a pin into a neighboring
// country at low zoom (e.g. Tuscany clustering with Rome and landing in
// Bosnia, 6 degrees/~650km away from their shared centroid).
const PIN_OVERLAP_PX = 40;
const PIN_SPREAD_PX = 22;

const spreadOverlappingDestinations = (map, destinations) => {
  const zoom = map.getZoom();
  const points = destinations.map((dest) => {
    const latlng = L.latLng(parseFloat(dest.lat), parseFloat(dest.lon));
    return { ...dest, latlng, px: map.project(latlng, zoom) };
  });

  const clusterOf = points.map((_, i) => i);
  const find = (i) => (clusterOf[i] === i ? i : (clusterOf[i] = find(clusterOf[i])));
  const union = (a, b) => { clusterOf[find(a)] = find(b); };

  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      if (points[i].px.distanceTo(points[j].px) < PIN_OVERLAP_PX) union(i, j);
    }
  }

  const clusterMembers = {};
  points.forEach((_, i) => {
    const root = find(i);
    (clusterMembers[root] ??= []).push(i);
  });

  return points.map((point, i) => {
    const members = clusterMembers[find(i)];
    if (members.length === 1) return { ...point, lat: point.latlng.lat, lon: point.latlng.lng };

    const centroidPx = members
      .reduce((acc, idx) => acc.add(points[idx].px), L.point(0, 0))
      .divideBy(members.length);
    const angle = (members.indexOf(i) / members.length) * 2 * Math.PI;
    const spreadPx = centroidPx.add(L.point(Math.cos(angle) * PIN_SPREAD_PX, Math.sin(angle) * PIN_SPREAD_PX));
    const spreadLatLng = map.unproject(spreadPx, zoom);
    return { ...point, lat: spreadLatLng.lat, lon: spreadLatLng.lng };
  });
};

// Renders the city-level pins, recalculating the pixel-space anti-overlap
// spread whenever the zoom changes (a fixed pixel offset needs a fresh
// lat/lon conversion per zoom level - see spreadOverlappingDestinations).
const DestinationPins = ({ destinations }) => {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());

  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
  });

  const spreadDestinations = useMemo(
    () => spreadOverlappingDestinations(map, destinations),
    [map, destinations, zoom]
  );

  return spreadDestinations.map((dest, i) => (
    <Marker key={i} position={[dest.lat, dest.lon]} icon={createDestinationMarker(dest.count)}>
      <CityPinPreview destination={dest} />
    </Marker>
  ));
};

// Silently recenters the map on the user's location if permission was
// already granted elsewhere in the app; never prompts on its own (opening
// Home isn't a deliberate enough action to justify a permission dialog).
const LocationCenterer = () => {
  const map = useMap();
  const { getLocationIfPermitted } = useCurrentLocation();

  useEffect(() => {
    let cancelled = false;
    getLocationIfPermitted().then((coords) => {
      if (coords && !cancelled) map.setView([coords.lat, coords.lon], USER_LOCATION_ZOOM);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

// Explicit control the user can press to center on their own location,
// prompting for permission if it hasn't been decided yet.
const CenterOnMeButton = () => {
  const { t } = useTranslation();
  const map = useMap();
  const { getCurrentLocation, loading } = useCurrentLocation();

  const handleClick = async () => {
    try {
      const { lat, lon } = await getCurrentLocation();
      map.flyTo([lat, lon], USER_LOCATION_ZOOM);
    } catch {
      toast.error(t("common.locationPermissionDeniedToast"));
    }
  };

  return (
    <button
      type="button"
      className="world-map__locate-btn"
      onClick={handleClick}
      disabled={loading}
      aria-label={t("common.useMyLocation")}
      title={t("common.useMyLocation")}
    >
      <IoLocateOutline size={18} />
    </button>
  );
};

// Tracks the map's zoom/bounds and fetches individual itinerary places for
// the visible viewport once zoomed in past PLACES_ZOOM_THRESHOLD.
const ViewportPlacesWatcher = ({ onZoomChange, onPlacesChange, onLoadingChange }) => {
  const fetchTimer = useRef(null);
  // Bumped on every fetch kicked off; a response only gets applied if it's
  // still the most recent one requested, so a slower response for an older
  // viewport can't overwrite a faster one for the viewport the user is
  // actually looking at now (panning/zooming quickly fires several fetches
  // whose responses can arrive out of order).
  const requestId = useRef(0);

  useEffect(() => () => clearTimeout(fetchTimer.current), []);

  const handleUpdate = (map) => {
    const zoom = map.getZoom();
    onZoomChange(zoom);
    clearTimeout(fetchTimer.current);
    if (zoom < PLACES_ZOOM_THRESHOLD) {
      onLoadingChange(false);
      return;
    }

    fetchTimer.current = setTimeout(async () => {
      const thisRequestId = ++requestId.current;
      const bounds = map.getBounds();
      onLoadingChange(true);
      try {
        const places = await getPlacesInBounds({
          minLat: bounds.getSouth(),
          maxLat: bounds.getNorth(),
          minLon: bounds.getWest(),
          maxLon: bounds.getEast(),
        });
        if (thisRequestId === requestId.current) onPlacesChange(places);
      } catch {
        if (thisRequestId === requestId.current) onPlacesChange([]);
      } finally {
        if (thisRequestId === requestId.current) onLoadingChange(false);
      }
    }, 400);
  };

  const map = useMapEvents({
    moveend: () => handleUpdate(map),
    zoomend: () => handleUpdate(map),
  });

  return null;
};

// Lazy-loads a handful of itineraries for a destination the first time its
// popup opens, instead of fetching every city's preview up front.
const CityPinPreview = ({ destination }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [itineraries, setItineraries] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleOpen = async () => {
    if (itineraries || loading) return;
    setLoading(true);
    try {
      const data = await getItinerariesByFilters({ destination: destination.name, limit: 3 });
      setItineraries(data.itineraries ?? []);
    } catch {
      setItineraries([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popup eventHandlers={{ add: handleOpen }}>
      <div className="world-map__preview">
        <strong>{destination.name}</strong>
        <span>{t("home.worldMapItineraryCount", { count: destination.count })}</span>

        {loading && <span className="world-map__preview-loading">{t("common.loading")}</span>}

        {itineraries?.length > 0 && (
          <div className="world-map__preview-thumbs">
            {itineraries.map((it) => (
              <button
                key={it.id}
                type="button"
                className="world-map__preview-thumb"
                data-tooltip={it.title}
                onClick={() => navigate(`/itinerary/${it.id}`)}
              >
                <img src={optimizedCloudinaryUrl(it.photoUrl, { width: 120 })} alt="" />
                <span>{it.title}</span>
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          className="world-map__preview-link"
          onClick={() => navigate(`/explore?location=${encodeURIComponent(destination.name)}`)}
        >
          {t("home.worldMapSeeAll")}
        </button>
      </div>
    </Popup>
  );
};

const PlacePinPreview = ({ place }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const CategoryIcon = getCategoryIcon(place.category);

  return (
    <Popup>
      <div className="world-map__preview">
        <div className="world-map__preview-title-row">
          {CategoryIcon && <CategoryIcon className="world-map__preview-category-icon" />}
          <strong>{place.name}</strong>
        </div>

        {place.count > 0 && (
          <span>{t("home.worldMapPlaceVisitedCount", { count: place.count })}</span>
        )}

        {place.samplePhotoUrl && (
          <div className="world-map__preview-photo-wrap" data-tooltip={place.sampleItineraryTitle}>
            <img
              className="world-map__preview-photo"
              src={optimizedCloudinaryUrl(place.samplePhotoUrl, { width: 160 })}
              alt=""
              onClick={() => navigate(`/itinerary/${place.sampleItineraryId}`)}
            />
          </div>
        )}
        <button
          type="button"
          className="world-map__preview-link"
          onClick={() => navigate(`/itinerary/${place.sampleItineraryId}`)}
        >
          {place.sampleItineraryTitle}
        </button>
      </div>
    </Popup>
  );
};

const WorldMap = () => {
  const { t } = useTranslation();
  const [destinations, setDestinations] = useState([]);
  const [places, setPlaces] = useState([]);
  const [zoom, setZoom] = useState(2);
  const [placesLoading, setPlacesLoading] = useState(false);
  const showPlaces = zoom >= PLACES_ZOOM_THRESHOLD;

  useEffect(() => {
    getDestinations()
      .then(setDestinations)
      .catch(() => {});
  }, []);

  return (
    <div className="world-map">
      {showPlaces && placesLoading && (
        <span className="world-map__places-loading">{t("common.loading")}</span>
      )}
      <MapContainer
        center={[20, 10]}
        zoom={2}
        className="world-map__container"
        scrollWheelZoom={false}
        minZoom={2}
        maxZoom={16}
        maxBounds={[[-85, -180], [85, 180]]}
        maxBoundsViscosity={1.0}
      >
        <EnglishBasemap />
        <LocationCenterer />
        <CenterOnMeButton />
        <ViewportPlacesWatcher onZoomChange={setZoom} onPlacesChange={setPlaces} onLoadingChange={setPlacesLoading} />

        {showPlaces
          ? places.map((place) => (
              <Marker key={place.id} position={[place.lat, place.lon]} icon={createPlaceMarker()}>
                <PlacePinPreview place={place} />
              </Marker>
            ))
          : <DestinationPins destinations={destinations} />}
      </MapContainer>
    </div>
  );
};

export default WorldMap;
