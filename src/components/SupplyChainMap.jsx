import React, { useMemo } from "react";
import { Map, GoogleApiWrapper, Marker } from "google-maps-react";
import { Factory, Truck } from "lucide-react";

const factoryCoords = {
  lat: 28.6139,
  lng: 77.209,
};

const locationToCoords = {
  "Factory Main Unit": factoryCoords,
  "In Transit to Distributor": {
    lat: 28.4595,
    lng: 77.0266,
  },
};

const SupplyChainMapBase = ({ google, lastLocation, status }) => {
  const center = useMemo(() => {
    if (lastLocation && locationToCoords[lastLocation]) {
      return locationToCoords[lastLocation];
    }
    return factoryCoords;
  }, [lastLocation]);

  const truckPosition = useMemo(() => {
    if (lastLocation && locationToCoords[lastLocation]) {
      return locationToCoords[lastLocation];
    }
    return null;
  }, [lastLocation]);

  return (
    <div className="w-full h-80 relative rounded-xl overflow-hidden border border-gray-700 bg-gray-900">
      <Map
        google={google}
        zoom={8}
        initialCenter={center}
        center={center}
        style={{ width: "100%", height: "100%", position: "relative" }}
      >
        <Marker
          position={factoryCoords}
          title="Factory"
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#22c55e",
            fillOpacity: 1,
            strokeColor: "#14532d",
            strokeWeight: 2,
          }}
        />
        {truckPosition && (
          <Marker
            position={truckPosition}
            title="Truck"
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#3b82f6",
              fillOpacity: 1,
              strokeColor: "#1e3a8a",
              strokeWeight: 2,
            }}
          />
        )}
      </Map>
      <div className="absolute top-3 left-3 flex gap-3 px-3 py-2 bg-gray-900/80 rounded-lg backdrop-blur text-xs text-gray-300">
        <div className="flex items-center gap-1.5">
          <Factory className="w-4 h-4 text-green-400" />
          <span>Factory</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Truck
            className={
              "w-4 h-4 text-blue-400" +
              (status === "In Transit" ? " animate-pulse" : "")
            }
          />
          <span>Truck</span>
        </div>
      </div>
    </div>
  );
};

const apiKey =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
  import.meta.env.GOOGLE_MAPS_API_KEY;

export default GoogleApiWrapper({
  apiKey,
})(SupplyChainMapBase);

