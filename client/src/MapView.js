import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './index.css';

// Set your Mapbox token
mapboxgl.accessToken = ""

// Replace the existing carSvg with this new one
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

const MapView = ({ coordinates }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);

  useEffect(() => {
    if (!mapContainer.current || !coordinates || coordinates.length === 0) return;

    // Calculate center point of all coordinates
    const center = coordinates.reduce(
      (acc, curr) => [acc[0] + curr[0]/coordinates.length, acc[1] + curr[1]/coordinates.length],
      [0, 0]
    );

    try {
      // Initialize map only once
      if (!map.current) {
        const mapInstance = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [center[1], center[0]], // [lng, lat]
          zoom: 12,
          pitch: 45,
          bearing: 0,
          antialias: true
        });

        map.current = mapInstance;

        // Wait for map to load before adding layers and markers
        mapInstance.on('load', () => {
          // Add 3D building layer
          mapInstance.addLayer({
            'id': '3d-buildings',
            'source': 'composite',
            'source-layer': 'building',
            'filter': ['==', 'extrude', 'true'],
            'type': 'fill-extrusion',
            'minzoom': 15,
            'paint': {
              'fill-extrusion-color': '#aaa',
              'fill-extrusion-height': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                0,
                15.05,
                ['get', 'height']
              ],
              'fill-extrusion-base': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                0,
                15.05,
                ['get', 'min_height']
              ],
              'fill-extrusion-opacity': 0.6
            }
          });

          // Add markers for all coordinates
          coordinates.forEach((coord, index) => {
            const marker = createMarker()
              .setLngLat([coord[1], coord[0]])
              .addTo(mapInstance);

            // Store the marker reference
            markers.current.push(marker);

            // Add popup with vehicle information
            const popup = new mapboxgl.Popup({ offset: 25 })
              .setHTML(`
                <div style="font-family: inherit; font-size: 14px; color: #1a1a1a;">
                  <h3 style="margin: 0 0 8px 0; font-size: 14px;">Vehicle ${coord.vehicleId || 'Unknown'}</h3>
                  <p style="margin: 0 0 4px 0;">Heading: ${coord.heading || 0}°</p>
                  <p style="margin: 0 0 4px 0;">Speed: ${(coord.speed || 0).toFixed(2)} mph</p>
                  <p style="margin: 0;">Onboard: ${coord.onboardQuantity || 0}</p>
                </div>
              `);

            marker.setPopup(popup);
          });
        });

        // Add navigation controls
        mapInstance.addControl(new mapboxgl.NavigationControl());
      } else {
        // Update existing markers
        markers.current.forEach(marker => marker.remove());
        markers.current = [];

        coordinates.forEach((coord, index) => {
          const marker = createMarker()
            .setLngLat([coord[1], coord[0]])
            .addTo(map.current);

          const popup = new mapboxgl.Popup({ offset: 25 })
            .setHTML(`
              <div style="font-family: inherit; font-size: 14px;">
                <h3 style="margin: 0 0 8px 0; font-size: 14px;">Vehicle ${coord.vehicleId || 'Unknown'}</h3>
                <p style="margin: 0 0 4px 0;">Heading: ${coord.heading || 0}°</p>
                <p style="margin: 0 0 4px 0;">Speed: ${(coord.speed || 0).toFixed(2)} mph</p>
                <p style="margin: 0;">Onboard: ${coord.onboardQuantity || 0}</p>
              </div>
            `);

          marker.setPopup(popup);
          markers.current.push(marker);
        });

        // Update map center and zoom to fit all markers
        const bounds = new mapboxgl.LngLatBounds();
        coordinates.forEach(coord => {
          bounds.extend([coord[1], coord[0]]);
        });

        map.current.fitBounds(bounds, {
          padding: 50,
          duration: 1000
        });
      }

    } catch (error) {
      console.error('Map initialization error:', error);
    }

    // Cleanup function
    return () => {
      if (markers.current) {
        markers.current.forEach(marker => marker.remove());
        markers.current = [];
      }
      if (map.current && map.current.remove) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [coordinates]);

  return (
    <div 
      ref={mapContainer} 
      style={{ 
        width: '100%', 
        height: '400px',
        position: 'relative',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
      }}
    />
  );
};

// Update the createMarker function to adjust the styling
const createMarker = () => {
  const el = document.createElement('div');
  el.innerHTML = carSvg;
  el.style.transform = 'rotate(0deg)';
  el.style.width = '32px';  // Adjust size as needed
  el.style.height = '32px'; // Adjust size as needed
  
  return new mapboxgl.Marker({
    element: el,
    anchor: 'center'
  });
};

export default MapView;