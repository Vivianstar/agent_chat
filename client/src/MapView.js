import React, { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './index.css';

// Set your Mapbox token
mapboxgl.accessToken = "";

const carSvg = `
<svg width="32" height="32" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(0,20)">
    <path d="M160 80c0-44.183-35.817-80-80-80S0 35.817 0 80s35.817 80 80 80s80-35.817 80-80z" fill="#B22222"/>
    <path d="M135 85c0 2.5-1.5 4.5-3.5 4.5h-13c-2 0-3.5-2-3.5-4.5v-20c0-2.5 1.5-4.5 3.5-4.5h13c2 0 3.5 2 3.5 4.5v20z" fill="#1a1a1a"/>
    <path d="M45 85c0 2.5-1.5 4.5-3.5 4.5h-13c-2 0-3.5-2-3.5-4.5v-20c0-2.5 1.5-4.5 3.5-4.5h13c2 0 3.5 2 3.5 4.5v20z" fill="#1a1a1a"/>
    <path d="M140 70H20c-5.523 0-10 4.477-10 10v30c0 5.523 4.477 10 10 10h120c5.523 0 10-4.477 10-10V80c0-5.523-4.477-10-10-10z" fill="#B22222"/>
    <path d="M135 75H25c-2.761 0-5 2.239-5 5v25c0 2.761 2.239 5 5 5h110c2.761 0 5-2.239 5-5V80c0-2.761-2.239-5-5-5z" fill="#1a1a1a"/>
  </g>
</svg>
`;

const MapView = ({ vehicles }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef({});

  const createMarker = (vehicle) => {
    const el = document.createElement('div');
    el.className = 'vehicle-marker';
    el.innerHTML = carSvg;

    // Make sure location data exists and is valid
    if (!vehicle.location || !Array.isArray(vehicle.location) || vehicle.location.length !== 2) {
      console.error('Invalid vehicle location data:', vehicle);
      return null;
    }

    const marker = new mapboxgl.Marker({
      element: el,
      anchor: 'center'
    })
      .setLngLat([vehicle.location[1], vehicle.location[0]])
      .addTo(map.current);

    // Store marker with additional data
    markersRef.current[vehicle.id] = {
      marker,
      vehicle,
      currentPosition: [vehicle.location[1], vehicle.location[0]]
    };

    return marker;
  };

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-105.2705, 40.0150],
      zoom: 12
    });

    // Wait for map to load before adding click handler
    map.current.on('load', () => {
      map.current.on('click', (e) => {
        const activeMarkers = Object.values(markersRef.current).filter(m => m && m.marker);
        
        if (activeMarkers.length === 0) {
          console.log('No active markers available');
          return;
        }

        // Select random vehicle
        const randomMarker = activeMarkers[Math.floor(Math.random() * activeMarkers.length)];
        
        if (!randomMarker || !randomMarker.marker) {
          console.error('Invalid marker selected');
          return;
        }

        const currentPosition = randomMarker.marker.getLngLat();
        const clickPosition = e.lngLat;

        // Add destination marker
        new mapboxgl.Marker({ color: '#ef4444' })
          .setLngLat(clickPosition)
          .addTo(map.current);

        // Draw route line
        if (map.current.getSource('route')) {
          map.current.removeLayer('route');
          map.current.removeSource('route');
        }

        map.current.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: [
                [currentPosition.lng, currentPosition.lat],
                [clickPosition.lng, clickPosition.lat]
              ]
            }
          }
        });

        map.current.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#3b82f6',
            'line-width': 2,
            'line-dasharray': [2, 2]
          }
        });
      });
    });

    return () => {
      Object.values(markersRef.current).forEach(({ marker }) => {
        if (marker) marker.remove();
      });
      if (map.current) map.current.remove();
    };
  }, []);

  // Update markers when vehicles change
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    Object.values(markersRef.current).forEach(({ marker }) => {
      if (marker) marker.remove();
    });
    markersRef.current = {};

    // Add new markers for each vehicle
    vehicles.forEach(vehicle => {
      if (vehicle && vehicle.location) {
        createMarker(vehicle);
      }
    });

    // Fit map to show all vehicles
    if (vehicles.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      vehicles.forEach(vehicle => {
        if (vehicle.location) {
          bounds.extend([vehicle.location[1], vehicle.location[0]]);
        }
      });
      map.current.fitBounds(bounds, { padding: 50 });
    }
  }, [vehicles]);

  return (
    <div 
      ref={mapContainer} 
      style={{ 
        height: '400px', 
        borderRadius: '8px',
        border: '1px solid #ccc'
      }} 
    />
  );
};

export default MapView;