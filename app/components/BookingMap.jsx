"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Tooltip,
  Circle,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import styles from "./BookingMap.module.css";

const DEFAULT_CENTER = [20.011, 73.79]; // Nashik, India

// Create custom SVG Leaflet div icons with pixel-perfect zero-offset needle anchors
const createPickupIcon = () =>
  new L.DivIcon({
    className: "cabgo-custom-div-icon",
    html: `
      <div class="cabgo-marker-root">
        <div class="cabgo-pin-badge cabgo-badge-pickup">
          <span class="cabgo-badge-icon">●</span>
          <span class="cabgo-badge-text">Pickup</span>
        </div>
        <div class="cabgo-pin-stem">
          <svg class="cabgo-pin-svg" width="34" height="44" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M17 44 C 13.5 34 3.5 24 3.5 15.5 A 13.5 13.5 0 1 1 30.5 15.5 C 30.5 24 20.5 34 17 44 Z"
              fill="#16a34a"
              stroke="#ffffff"
              stroke-width="2"
              stroke-linejoin="round"
            />
            <circle cx="17" cy="15.5" r="6" fill="#ffffff" />
            <circle cx="17" cy="15.5" r="3" fill="#15803d" />
          </svg>
        </div>
        <div class="cabgo-ground-anchor">
          <div class="cabgo-anchor-pulse cabgo-pulse-pickup"></div>
          <div class="cabgo-anchor-dot"></div>
        </div>
      </div>
    `,
    iconSize: [80, 78],
    iconAnchor: [40, 66],
    popupAnchor: [0, -66],
  });

const createDropoffIcon = () =>
  new L.DivIcon({
    className: "cabgo-custom-div-icon",
    html: `
      <div class="cabgo-marker-root">
        <div class="cabgo-pin-badge cabgo-badge-dropoff">
          <span class="cabgo-badge-icon">⚑</span>
          <span class="cabgo-badge-text">Drop-off</span>
        </div>
        <div class="cabgo-pin-stem">
          <svg class="cabgo-pin-svg" width="34" height="44" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M17 44 C 13.5 34 3.5 24 3.5 15.5 A 13.5 13.5 0 1 1 30.5 15.5 C 30.5 24 20.5 34 17 44 Z"
              fill="#dc2626"
              stroke="#ffffff"
              stroke-width="2"
              stroke-linejoin="round"
            />
            <circle cx="17" cy="15.5" r="7" fill="#ffffff" />
            <path d="M14 19.5V11.5h1.2v1h4.6l-.8 2 0.8 2H15.2v3H14z" fill="#dc2626" />
          </svg>
        </div>
        <div class="cabgo-ground-anchor">
          <div class="cabgo-anchor-pulse cabgo-pulse-dropoff"></div>
          <div class="cabgo-anchor-dot"></div>
        </div>
      </div>
    `,
    iconSize: [80, 78],
    iconAnchor: [40, 66],
    popupAnchor: [0, -66],
  });

// Nearby available driver cab icon within 1-2 km radius
const createCabIcon = () =>
  new L.DivIcon({
    className: "cabgo-custom-div-icon",
    html: `
      <div style="position:relative; width:34px; height:34px; display:flex; align-items:center; justify-content:center;">
        <div style="position:absolute; width:32px; height:32px; border-radius:50%; background:rgba(244,196,1,0.25); animation:cabgoPulse 2.4s infinite;"></div>
        <div style="width:26px; height:26px; border-radius:50%; background:#0f172a; border:2px solid #f4c401; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(0,0,0,0.35); font-size:13px;">
          🚖
        </div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });

// Map click handler component
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(event) {
      onMapClick(event.latlng);
    },
  });
  return null;
}

// Map controller for invalidating size, auto-bounds, and programmatic pan
function MapController({ pickup, dropoff, centerTrigger }) {
  const map = useMap();
  const hasFittedRef = useRef(false);

  // Invalidate size on mount & observe container resize to prevent coordinate drift
  useEffect(() => {
    map.invalidateSize();
    const timer = setTimeout(() => map.invalidateSize(), 150);

    const container = map.getContainer();
    if (!container || typeof ResizeObserver === "undefined") {
      return () => clearTimeout(timer);
    }

    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(container);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [map]);

  // Handle bounds fitting once both points are present, without jarring single-click pans
  useEffect(() => {
    if (pickup && dropoff && !hasFittedRef.current) {
      try {
        const bounds = L.latLngBounds([
          [pickup.lat, pickup.lng],
          [dropoff.lat, dropoff.lng],
        ]);
        map.fitBounds(bounds, { padding: [65, 65], maxZoom: 15, animate: true });
        hasFittedRef.current = true;
      } catch (e) {
        // Fallback silently if bounds invalid
      }
    } else if (!pickup && !dropoff) {
      hasFittedRef.current = false;
    }
  }, [pickup, dropoff, map]);

  // Center trigger when user clicks "My Location" or preset
  useEffect(() => {
    if (centerTrigger) {
      map.setView([centerTrigger.lat, centerTrigger.lng], 14, { animate: true });
    }
  }, [centerTrigger, map]);

  return null;
}

// Helper to reverse geocode coordinate to human-readable address with concise landmark extraction
async function reverseGeocode(lat, lng) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2800);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      {
        signal: controller.signal,
        headers: { "Accept-Language": "en" },
      }
    );
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data) {
        const addr = data.address || {};
        const place =
          addr.amenity ||
          addr.shop ||
          addr.building ||
          addr.leisure ||
          addr.tourism ||
          addr.mall ||
          addr.railway ||
          addr.station ||
          addr.hospital ||
          addr.college ||
          addr.university;
        const road = addr.road || addr.street;
        const neighbourhood = addr.suburb || addr.neighbourhood || addr.residential;
        const city = addr.city || addr.town || addr.village || "Nashik";

        const parts = [];
        if (place) parts.push(place);
        if (road && !parts.includes(road)) parts.push(road);
        if (neighbourhood && !parts.includes(neighbourhood)) parts.push(neighbourhood);

        if (parts.length > 0) {
          return parts.slice(0, 2).join(", ") + (city ? ` · ${city}` : "");
        }

        if (data.display_name) {
          return data.display_name.split(", ").slice(0, 3).join(", ");
        }
      }
    }
  } catch {
    // Graceful fallback on network timeout or offline
  }
  return `Point near Nashik (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
}

export default function BookingMap({
  locations,
  pickupAddress,
  dropoffAddress,
  onLocationsChange,
  onAddressResolved,
}) {
  const [pickup, setPickup] = useState(locations?.pickup || null);
  const [dropoff, setDropoff] = useState(locations?.dropoff || null);
  const [selecting, setSelecting] = useState("pickup");
  const [centerTrigger, setCenterTrigger] = useState(null);
  const [locating, setLocating] = useState(false);
  const [icons, setIcons] = useState({ pickup: null, dropoff: null, cab: null });

  // Map layer view mode: "streets" | "satellite" | "hybrid"
  const [mapMode, setMapMode] = useState("streets");

  // Loading state for address resolution in cards
  const [resolvingPickup, setResolvingPickup] = useState(false);
  const [resolvingDropoff, setResolvingDropoff] = useState(false);

  // Sync external locations prop if it changes externally (e.g. reset from parent or GPS auto-detected)
  useEffect(() => {
    if (locations?.pickup && !pickup) {
      setCenterTrigger(locations.pickup);
    }
    if (locations) {
      setPickup(locations.pickup || null);
      setDropoff(locations.dropoff || null);
    }
  }, [locations]);

  // Initialize icons safely on client
  useEffect(() => {
    setIcons({
      pickup: createPickupIcon(),
      dropoff: createDropoffIcon(),
      cab: createCabIcon(),
    });
  }, []);

  // Compute nearby drivers strictly within 1-2 km radius of pickup point
  const nearbyDrivers = useMemo(() => {
    if (!pickup) return [];
    return [
      { id: "cab-1", lat: pickup.lat + 0.006, lng: pickup.lng + 0.005, dist: "0.8 km" },
      { id: "cab-2", lat: pickup.lat - 0.007, lng: pickup.lng - 0.006, dist: "1.1 km" },
      { id: "cab-3", lat: pickup.lat + 0.004, lng: pickup.lng - 0.008, dist: "1.3 km" },
    ];
  }, [pickup]);

  const handlePointSelect = useCallback(
    async (latlng) => {
      const point = {
        lat: Number(latlng.lat.toFixed(6)),
        lng: Number(latlng.lng.toFixed(6)),
      };

      let nextPickup = pickup;
      let nextDropoff = dropoff;
      const currentSelecting = selecting;

      if (currentSelecting === "pickup") {
        nextPickup = point;
        setPickup(point);
        setSelecting("dropoff");
        setResolvingPickup(true);
      } else {
        nextDropoff = point;
        setDropoff(point);
        setSelecting("pickup");
        setResolvingDropoff(true);
      }

      onLocationsChange?.({
        pickup: nextPickup,
        dropoff: nextDropoff,
      });

      // Asynchronously reverse geocode and populate address
      try {
        const address = await reverseGeocode(point.lat, point.lng);
        onAddressResolved?.(currentSelecting, address, point);
      } catch {
        onAddressResolved?.(
          currentSelecting,
          `Point (${point.lat.toFixed(4)}, ${point.lng.toFixed(4)})`,
          point
        );
      } finally {
        if (currentSelecting === "pickup") {
          setResolvingPickup(false);
        } else {
          setResolvingDropoff(false);
        }
      }
    },
    [pickup, dropoff, selecting, onLocationsChange, onAddressResolved]
  );

  const handleMarkerDrag = useCallback(
    async (type, latlng) => {
      const point = {
        lat: Number(latlng.lat.toFixed(6)),
        lng: Number(latlng.lng.toFixed(6)),
      };

      if (type === "pickup") {
        setPickup(point);
        setResolvingPickup(true);
        onLocationsChange?.({ pickup: point, dropoff });
        try {
          const address = await reverseGeocode(point.lat, point.lng);
          onAddressResolved?.("pickup", address, point);
        } catch {
          onAddressResolved?.("pickup", `Point (${point.lat.toFixed(4)}, ${point.lng.toFixed(4)})`, point);
        } finally {
          setResolvingPickup(false);
        }
      } else {
        setDropoff(point);
        setResolvingDropoff(true);
        onLocationsChange?.({ pickup, dropoff: point });
        try {
          const address = await reverseGeocode(point.lat, point.lng);
          onAddressResolved?.("dropoff", address, point);
        } catch {
          onAddressResolved?.("dropoff", `Point (${point.lat.toFixed(4)}, ${point.lng.toFixed(4)})`, point);
        } finally {
          setResolvingDropoff(false);
        }
      }
    },
    [pickup, dropoff, onLocationsChange, onAddressResolved]
  );

  const resetLocations = () => {
    setPickup(null);
    setDropoff(null);
    setSelecting("pickup");

    onLocationsChange?.({
      pickup: null,
      dropoff: null,
    });
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setLocating(true);
    setResolvingPickup(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocating(false);
        const point = {
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        };

        setPickup(point);
        setCenterTrigger(point);
        setSelecting("dropoff");

        onLocationsChange?.({
          pickup: point,
          dropoff: dropoff,
        });

        try {
          const address = await reverseGeocode(point.lat, point.lng);
          onAddressResolved?.("pickup", address, point);
        } finally {
          setResolvingPickup(false);
        }
      },
      (err) => {
        setLocating(false);
        setResolvingPickup(false);
        console.warn("Geolocation error:", err.message);
        alert("Could not access your location. Please select on the map.");
      },
      { timeout: 7000, enableHighAccuracy: true }
    );
  };

  const handleQuickPreset = async (lat, lng, name) => {
    const point = { lat, lng };
    setCenterTrigger(point);

    if (selecting === "pickup") {
      setPickup(point);
      setSelecting("dropoff");
      onLocationsChange?.({ pickup: point, dropoff });
      onAddressResolved?.("pickup", name, point);
    } else {
      setDropoff(point);
      setSelecting("pickup");
      onLocationsChange?.({ pickup, dropoff: point });
      onAddressResolved?.("dropoff", name, point);
    }
  };

  return (
    <div className={styles.wrapper}>
      {/* Top selection cards — Displays Selected Location Name instead of raw coordinates */}
      <div className={styles.locationCards}>
        <button
          type="button"
          onClick={() => setSelecting("pickup")}
          className={`${styles.locationCard} ${
            selecting === "pickup" ? styles.pickupActive : ""
          }`}
          aria-label="Select pickup point"
        >
          <span className={styles.pickupSymbol} />
          <div className={styles.locationContent}>
            <span className={styles.locationLabel}>PICKUP LOCATION</span>
            <strong className={styles.locationName}>
              {resolvingPickup
                ? "Locating address..."
                : pickupAddress || (pickup ? "Selected Location" : "Click map to set point")}
            </strong>
            {pickup && (
              <span className={styles.locationSubtext}>
                {pickup.lat.toFixed(4)}, {pickup.lng.toFixed(4)}
              </span>
            )}
          </div>
          {selecting === "pickup" && (
            <span className={styles.selectingTag}>Active Pin</span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setSelecting("dropoff")}
          className={`${styles.locationCard} ${
            selecting === "dropoff" ? styles.dropoffActive : ""
          }`}
          aria-label="Select destination point"
        >
          <span className={styles.dropoffSymbol} />
          <div className={styles.locationContent}>
            <span className={styles.locationLabel}>DESTINATION</span>
            <strong className={styles.locationName}>
              {resolvingDropoff
                ? "Locating address..."
                : dropoffAddress || (dropoff ? "Selected Destination" : "Click map to set point")}
            </strong>
            {dropoff && (
              <span className={styles.locationSubtext}>
                {dropoff.lat.toFixed(4)}, {dropoff.lng.toFixed(4)}
              </span>
            )}
          </div>
          {selecting === "dropoff" && (
            <span className={styles.selectingTagDropoff}>Active Pin</span>
          )}
        </button>
      </div>

      {/* Action banner with Satellite View toggle & GPS tool */}
      <div className={styles.mapActionBanner}>
        {/* Map Layer Switcher: Streets vs Satellite vs Hybrid */}
        <div className={styles.layerSwitcher}>
          <button
            type="button"
            onClick={() => setMapMode("streets")}
            className={`${styles.layerBtn} ${
              mapMode === "streets" ? styles.layerBtnActive : ""
            }`}
          >
            🗺️ Streets
          </button>
          <button
            type="button"
            onClick={() => setMapMode("satellite")}
            className={`${styles.layerBtn} ${
              mapMode === "satellite" ? styles.layerBtnActive : ""
            }`}
          >
            🛰️ Satellite
          </button>
          <button
            type="button"
            onClick={() => setMapMode("hybrid")}
            className={`${styles.layerBtn} ${
              mapMode === "hybrid" ? styles.layerBtnActive : ""
            }`}
          >
            🏷️ Hybrid
          </button>
        </div>

        {/* GPS Location tool */}
        <div className={styles.quickTools}>
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={locating}
            className={styles.gpsButton}
            title="Use current device location"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="12" cy="12" r="8" />
              <line x1="12" y1="2" x2="12" y2="5" />
              <line x1="12" y1="19" x2="12" y2="22" />
              <line x1="2" y1="12" x2="5" y2="12" />
              <line x1="19" y1="12" x2="22" y2="12" />
            </svg>
            <span>{locating ? "Locating..." : "My Location"}</span>
          </button>
        </div>
      </div>

      {/* Leaflet map container with Streets / Satellite layers */}
      <div className={styles.mapFrame}>
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={12}
          scrollWheelZoom
          className={styles.map}
        >
          {/* Default OpenStreetMap layer */}
          {mapMode === "streets" && (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          )}

          {/* High-Resolution Satellite Imagery (Esri World Imagery) */}
          {(mapMode === "satellite" || mapMode === "hybrid") && (
            <TileLayer
              attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />
          )}

          {/* Hybrid Reference Overlay: Boundaries and Place Names on top of Satellite */}
          {mapMode === "hybrid" && (
            <TileLayer
              attribution="&copy; Esri &mdash; Boundaries and Places"
              url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />
          )}

          <MapClickHandler onMapClick={handlePointSelect} />

          <MapController
            pickup={pickup}
            dropoff={dropoff}
            centerTrigger={centerTrigger}
          />

          {pickup && icons.pickup && (
            <Marker
              position={[pickup.lat, pickup.lng]}
              icon={icons.pickup}
              draggable={true}
              eventHandlers={{
                dragend: (e) => {
                  handleMarkerDrag("pickup", e.target.getLatLng());
                },
                click: () => {
                  setSelecting("pickup");
                },
              }}
            >
              <Tooltip permanent={false} direction="top" offset={[0, -66]}>
                Pickup: {pickupAddress || `${pickup.lat.toFixed(4)}, ${pickup.lng.toFixed(4)}`} (Drag to fine-tune)
              </Tooltip>
            </Marker>
          )}

          {dropoff && icons.dropoff && (
            <Marker
              position={[dropoff.lat, dropoff.lng]}
              icon={icons.dropoff}
              draggable={true}
              eventHandlers={{
                dragend: (e) => {
                  handleMarkerDrag("dropoff", e.target.getLatLng());
                },
                click: () => {
                  setSelecting("dropoff");
                },
              }}
            >
              <Tooltip permanent={false} direction="top" offset={[0, -66]}>
                Drop-off: {dropoffAddress || `${dropoff.lat.toFixed(4)}, ${dropoff.lng.toFixed(4)}`} (Drag to fine-tune)
              </Tooltip>
            </Marker>
          )}

          {/* 1.5 km Dispatch Radius Circle around Pickup */}
          {pickup && (
            <Circle
              center={[pickup.lat, pickup.lng]}
              radius={1500}
              pathOptions={{
                color: "#f4c401",
                fillColor: "#f4c401",
                fillOpacity: 0.06,
                weight: 1.5,
                dashArray: "5, 5",
              }}
            />
          )}

          {/* Available driver cabs strictly within 1-2 km radius */}
          {pickup &&
            icons.cab &&
            nearbyDrivers.map((driver) => (
              <Marker
                key={driver.id}
                position={[driver.lat, driver.lng]}
                icon={icons.cab}
              >
                <Tooltip permanent={false} direction="top" offset={[0, -18]}>
                  Available Driver ({driver.dist} away · within 1.5 km)
                </Tooltip>
              </Marker>
            ))}

          {/* Visual route polyline between pickup and dropoff */}
          {pickup && dropoff && (
            <Polyline
              positions={[
                [pickup.lat, pickup.lng],
                [dropoff.lat, dropoff.lng],
              ]}
              interactive={false}
              pathOptions={{
                color: mapMode === "streets" ? "#16794b" : "#22c55e",
                weight: 5,
                dashArray: "8, 8",
                opacity: 0.95,
              }}
            />
          )}
        </MapContainer>

        {/* Floating status pills on the map */}
        {pickup && (
          <div className={styles.dispatchRadarPill}>
            <span className={styles.routeStatusDot} />
            <span>1.5 km Dispatch Zone ({nearbyDrivers.length} Cabs Nearby)</span>
          </div>
        )}

        {pickup && dropoff && (
          <div className={styles.routeRoutePill}>
            <span className={styles.routeStatusDot} />
            <span>Route Connected</span>
          </div>
        )}

        {/* Mode indicator badge */}
        <div className={styles.mapOverlay}>
          <span
            className={
              mapMode === "streets"
                ? styles.overlayDot
                : styles.overlayDotSatellite
            }
          />
          <span>
            {mapMode === "streets"
              ? "OpenStreetMap Streets"
              : mapMode === "satellite"
                ? "Esri Satellite View"
                : "Hybrid Satellite & Labels"}
          </span>
        </div>
      </div>

      {/* Quick Landmark Presets */}
      <div className={styles.presetsRow}>
        <span className={styles.presetsLabel}>Quick Nashik Landmarks:</span>
        <button
          type="button"
          onClick={() => handleQuickPreset(20.0063, 73.7915, "Nashik City Center Mall, Untwadi")}
          className={styles.presetChip}
        >
          City Center Mall
        </button>
        <button
          type="button"
          onClick={() => handleQuickPreset(19.9975, 73.7898, "CBS Bus Stand, Old Agra Road")}
          className={styles.presetChip}
        >
          CBS Bus Stand
        </button>
        <button
          type="button"
          onClick={() => handleQuickPreset(19.9882, 73.8344, "Nashik Road Railway Station")}
          className={styles.presetChip}
        >
          Railway Station
        </button>
        <button
          type="button"
          onClick={() => handleQuickPreset(20.0165, 73.7656, "College Road, Gangapur Naka")}
          className={styles.presetChip}
        >
          College Road
        </button>
      </div>

      {/* Footer controls & legend */}
      <div className={styles.mapFooter}>
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <i className={styles.legendPickup} />
            Pickup Point
          </span>
          <span className={styles.legendItem}>
            <i className={styles.legendDestination} />
            Destination
          </span>
          {pickup && dropoff && (
            <span className={styles.legendItem}>
              <i className={styles.legendRouteLine} />
              Route Path
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={resetLocations}
          className={styles.resetButton}
        >
          Reset map ↺
        </button>
      </div>
    </div>
  );
}
