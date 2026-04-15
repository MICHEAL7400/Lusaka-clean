import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const ReportMap = ({ onLocationSelect, selectedLocation, center = [-15.4167, 28.2833], zoom = 13, reports = [] }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView(center, zoom);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    map.on('click', (e) => {
      if (onLocationSelect) {
        onLocationSelect([e.latlng.lat, e.latlng.lng]);
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (markerRef.current) {
      markerRef.current.remove();
    }

    if (selectedLocation) {
      markerRef.current = L.marker(selectedLocation).addTo(mapInstanceRef.current);
      mapInstanceRef.current.setView(selectedLocation, 15);
    }
  }, [selectedLocation]);

  useEffect(() => {
    if (!mapInstanceRef.current || !reports.length) return;

    reports.forEach(report => {
      if (report.latitude && report.longitude) {
        const color = report.status === 'pending' ? '#fbbf24' :
                      report.status === 'assigned' ? '#f97316' :
                      report.status === 'collected' ? '#10b981' : '#3b82f6';
        
        const marker = L.circleMarker([report.latitude, report.longitude], {
          radius: 8,
          fillColor: color,
          color: '#fff',
          weight: 2,
          fillOpacity: 0.9
        }).addTo(mapInstanceRef.current);
        
        marker.bindPopup(`
          <div style="padding: 8px;">
            <strong>${report.waste_type}</strong><br/>
            ${report.address}<br/>
            <span style="color: ${color}">Status: ${report.status}</span>
          </div>
        `);
      }
    });
  }, [reports]);

  return <div ref={mapRef} style={{ height: '400px', width: '100%', borderRadius: '8px' }} />;
};

export default ReportMap;