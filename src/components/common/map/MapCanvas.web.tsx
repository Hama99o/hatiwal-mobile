import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/reusables/text";
import { MapPinOff } from "lucide-react-native";
import type { MapCanvasProps } from "./MapCanvas.types";

/**
 * Web map canvas — interactive OpenStreetMap via Leaflet.
 *
 * Leaflet is loaded from a CDN at runtime (injected into <head>) rather than
 * imported through npm, so Metro never has to resolve/bundle it. This keeps the
 * native bundle clean while giving the browser a full draggable + zoomable map.
 */

const LEAFLET_VERSION = "1.9.4";
const CSS_URL = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`;
const JS_URL = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`;

let leafletPromise: Promise<any> | null = null;

function loadLeaflet(): Promise<any> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.reject(new Error("Leaflet requires a browser environment"));
  }
  const w = window as any;
  if (w.L) return Promise.resolve(w.L);
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise((resolve, reject) => {
    // CSS
    if (!document.querySelector(`link[href="${CSS_URL}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = CSS_URL;
      document.head.appendChild(link);
    }
    // JS
    const existing = document.querySelector(`script[src="${JS_URL}"]`) as HTMLScriptElement | null;
    if (existing && w.L) {
      resolve(w.L);
      return;
    }
    const script = existing ?? document.createElement("script");
    script.src = JS_URL;
    script.async = true;
    script.onload = () => resolve((window as any).L);
    script.onerror = () => reject(new Error("Failed to load Leaflet"));
    if (!existing) document.body.appendChild(script);
  });
  return leafletPromise;
}

export default function MapCanvas({
  center,
  radiusKm,
  onCenterChange,
  height,
  primaryColor,
  dark,
}: MapCanvasProps) {
  const { t } = useTranslation();
  const [loadFailed, setLoadFailed] = useState(false);
  const containerRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  // Keep the latest callback without re-initialising the map.
  const onCenterChangeRef = useRef(onCenterChange);
  onCenterChangeRef.current = onCenterChange;

  // Initialise the map once.
  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        const map = L.map(containerRef.current, {
          center: [center.latitude, center.longitude],
          zoom: 12,
          zoomControl: true,
          attributionControl: false,
        });
        mapRef.current = map;

        L.tileLayer(
          dark
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          { maxZoom: 19 }
        ).addTo(map);

        const marker = L.marker([center.latitude, center.longitude], {
          draggable: true,
        }).addTo(map);
        markerRef.current = marker;

        const circle = L.circle([center.latitude, center.longitude], {
          radius: radiusKm * 1000,
          color: primaryColor,
          weight: 2,
          fillColor: primaryColor,
          fillOpacity: 0.12,
        }).addTo(map);
        circleRef.current = circle;

        const handleMove = (lat: number, lng: number) => {
          marker.setLatLng([lat, lng]);
          circle.setLatLng([lat, lng]);
          onCenterChangeRef.current({ latitude: lat, longitude: lng });
        };
        marker.on("dragend", () => {
          const p = marker.getLatLng();
          handleMove(p.lat, p.lng);
        });
        map.on("click", (e: any) => handleMove(e.latlng.lat, e.latlng.lng));

        // Container size is known only after layout — recalc.
        setTimeout(() => map.invalidateSize(), 0);
      })
      .catch((err) => {
        console.error("MapCanvas: Leaflet failed to load", err);
        if (!cancelled) setLoadFailed(true);
      });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
        circleRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to external center changes (e.g. "Use my location").
  useEffect(() => {
    if (!mapRef.current || !markerRef.current || !circleRef.current) return;
    markerRef.current.setLatLng([center.latitude, center.longitude]);
    circleRef.current.setLatLng([center.latitude, center.longitude]);
    mapRef.current.setView([center.latitude, center.longitude]);
  }, [center.latitude, center.longitude]);

  // React to radius changes.
  useEffect(() => {
    if (circleRef.current) circleRef.current.setRadius(radiusKm * 1000);
  }, [radiusKm]);

  if (loadFailed) {
    return (
      <View
        style={{
          width: "100%",
          height,
          backgroundColor: dark ? "#1e293b" : "#e5e7eb",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 32,
          gap: 10,
        }}
      >
        <MapPinOff size={32} color={dark ? "#94a3b8" : "#64748b"} />
        <Text style={{ fontSize: 14, textAlign: "center", color: dark ? "#cbd5e1" : "#475569" }}>
          {t("browse.mapUnavailable")}
        </Text>
      </View>
    );
  }

  return (
    <View
      // @ts-ignore — on web, react-native-web forwards this ref to the DOM node
      ref={containerRef}
      style={{ width: "100%", height, backgroundColor: dark ? "#1e293b" : "#e5e7eb" }}
    />
  );
}
