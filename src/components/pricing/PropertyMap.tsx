import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons for Leaflet + bundlers
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface MapProperty {
  property_id: string;
  property_code: string | null;
  lat: number;
  lng: number;
  price: number | null;
  size_sqm: number | null;
  area: string | null;
  subcategory: string | null;
}

interface Props {
  properties: MapProperty[];
  selectedId?: string | null;
  onSelect?: (propertyId: string) => void;
}

const GREECE_CENTER: [number, number] = [39.6, 22.4];

export function PropertyMap({ properties, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: GREECE_CENTER,
      zoom: 10,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
  }, []);

  // Update markers when properties change
  useEffect(() => {
    const map = mapRef.current;
    const markers = markersRef.current;
    if (!map || !markers) return;

    markers.clearLayers();

    const validProps = properties.filter(p => p.lat && p.lng);
    if (validProps.length === 0) return;

    const bounds: [number, number][] = [];

    for (const p of validProps) {
      const isSelected = p.property_id === selectedId;
      const fmtPrice = p.price != null ? `€${p.price.toLocaleString('el-GR', { maximumFractionDigits: 0 })}` : '—';
      const fmtSize = p.size_sqm != null ? `${p.size_sqm} m²` : '';

      const marker = L.circleMarker([p.lat, p.lng], {
        radius: isSelected ? 8 : 5,
        fillColor: isSelected ? '#DC3545' : '#1B5299',
        color: isSelected ? '#DC3545' : '#1B5299',
        weight: isSelected ? 2 : 1,
        opacity: 0.8,
        fillOpacity: isSelected ? 0.9 : 0.5,
      });

      marker.bindPopup(
        `<div style="font-size:12px;line-height:1.4">
          <strong>${p.property_code || p.property_id.slice(0, 8)}</strong><br/>
          ${p.subcategory || '—'} · ${p.area || '—'}<br/>
          ${fmtPrice} ${fmtSize ? '· ' + fmtSize : ''}
        </div>`,
        { closeButton: false, maxWidth: 200 }
      );

      if (onSelect) {
        marker.on('click', () => onSelect(p.property_id));
      }

      markers.addLayer(marker);
      bounds.push([p.lat, p.lng]);
    }

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [20, 20], maxZoom: 14 });
    }
  }, [properties, selectedId, onSelect]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-lg"
      style={{ minHeight: 400 }}
    />
  );
}
