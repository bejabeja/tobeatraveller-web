import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import { MapContainer, Marker, TileLayer, Tooltip } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import { getDestinations } from "../../services/itineraries";
import "./WorldMap.scss";

const createDestinationMarker = (count) =>
  L.divIcon({
    className: "",
    html: `<div class="world-map__pin">${count > 99 ? "99+" : count}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

const WorldMap = () => {
  const navigate = useNavigate();
  const [destinations, setDestinations] = useState([]);

  useEffect(() => {
    getDestinations()
      .then(setDestinations)
      .catch(() => {});
  }, []);

  return (
    <div className="world-map">
      <MapContainer
        center={[20, 10]}
        zoom={2}
        className="world-map__container"
        scrollWheelZoom={false}
        minZoom={2}
        maxBounds={[[-85, -180], [85, 180]]}
        maxBoundsViscosity={1.0}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={10}
        />
        {destinations.map((dest, i) => (
          <Marker
            key={i}
            position={[parseFloat(dest.lat), parseFloat(dest.lon)]}
            icon={createDestinationMarker(dest.count)}
            eventHandlers={{
              click: () => navigate(`/explore?location=${encodeURIComponent(dest.name)}`),
            }}
          >
            <Tooltip direction="top" offset={[0, -20]}>
              <strong>{dest.name}</strong>
              <span>{dest.count} {dest.count === 1 ? "itinerary" : "itineraries"}</span>
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default WorldMap;
