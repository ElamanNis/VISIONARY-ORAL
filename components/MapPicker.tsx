
import React from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { URALSK_COORDS } from '../constants';
import { MapPin } from 'lucide-react';
import L from 'leaflet';

// Fix for default marker icons in Leaflet
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface MapPickerProps {
  location: [number, number] | null;
  onLocationSelect: (latlng: [number, number]) => void;
}

const MapEvents = ({ onSelect }: { onSelect: (latlng: [number, number]) => void }) => {
  useMapEvents({
    click(e) {
      onSelect([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
};

const MapPicker: React.FC<MapPickerProps> = ({ location, onLocationSelect }) => {
  return (
    <div className="h-64 md:h-96 w-full border-2 border-slate-200 rounded-xl overflow-hidden shadow-inner">
      <MapContainer center={URALSK_COORDS} zoom={13} scrollWheelZoom={true}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapEvents onSelect={onLocationSelect} />
        {location && <Marker position={location} />}
      </MapContainer>
      <div className="p-2 bg-slate-100 text-xs text-slate-500 flex items-center gap-1">
        <MapPin size={12} />
        {location ? `${location[0].toFixed(5)}, ${location[1].toFixed(5)}` : "Кликните на карту, чтобы выбрать местоположение"}
      </div>
    </div>
  );
};

export default MapPicker;
