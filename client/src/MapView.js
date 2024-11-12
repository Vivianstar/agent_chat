import React, { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './index.css';

// Set your Mapbox token
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;

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

// Add these helper functions at the top of your component
const moveTowards = (start, end, fraction) => {
  return [
    start[0] + (end[0] - start[0]) * fraction,
    start[1] + (end[1] - start[1]) * fraction
  ];
};

const MapView = ({ vehicles }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef({});
  const animationFrameId = useRef(null);
  const activeRoutes = useRef([]);

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

  const animate = (timestamp) => {
    if (!activeRoutes.current.length) {
      animationFrameId.current = null;
      return;
    }

    activeRoutes.current.forEach((route, index) => {
      route.progress += 0.005; // Adjust speed as needed

      if (route.progress >= 1) {
        // Remove completed route
        if (route.line) {
          if (map.current.getLayer(route.line)) {
            map.current.removeLayer(route.line);
          }
          if (map.current.getSource(route.line)) {
            map.current.removeSource(route.line);
          }
        }
        activeRoutes.current.splice(index, 1);
        return;
      }

      // Move marker
      const marker = markersRef.current[route.vehicleId]?.marker;
      if (marker) {
        const newPos = moveTowards(
          [route.start.lng, route.start.lat],
          [route.end.lng, route.end.lat],
          route.progress
        );
        marker.setLngLat(newPos);

        // Calculate and update rotation
        const dx = route.end.lng - route.start.lng;
        const dy = route.end.lat - route.start.lat;
        const rotation = Math.atan2(dx, dy) * (180 / Math.PI);
        const el = marker.getElement();
        el.style.transform = `${el.style.transform.replace(/rotate\([^)]*\)/, '')} rotate(${rotation}deg)`;
      }
    });

    animationFrameId.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-105.2705, 40.0150],
      zoom: 12
    });

    // Add navigation control (zoom in/out)
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

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
        new mapboxgl.Marker({ color: '#323aa8' })
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

        // Add route to animation queue
        activeRoutes.current.push({
          vehicleId: randomMarker.vehicle.id,
          start: currentPosition,
          end: clickPosition,
          progress: 0,
          line: 'route'
        });

        // Start animation if not already running
        if (!animationFrameId.current) {
          animationFrameId.current = requestAnimationFrame(animate);
        }
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

  // Add cleanup to your existing cleanup function
  useEffect(() => {
    // ... existing cleanup ...
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      // ... rest of existing cleanup ...
    };
  }, []);

  // Add CSS for smooth transitions
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .vehicle-marker {
        transition: transform 0.1s ease-out;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const simulateVehicleMovement = (vehicleId, direction) => {
    const markerData = markersRef.current[vehicleId];
    if (!markerData) return;

    const { marker, currentPosition } = markerData;
    const speed = 0.00001; // Adjust speed as needed

    const newPos = [
      currentPosition[0] + direction[0] * speed,
      currentPosition[1] + direction[1] * speed
    ];

    marker.setLngLat(newPos);

    // Update the current position to the new location
    markerData.currentPosition = newPos;
  };

  // Example usage: Move each vehicle in a specific direction
  const directions = vehicles.map(() => {
    // Generate a random direction vector for each vehicle
    const angle = -Math.random() * 2 * Math.PI;
    return [Math.cos(angle), Math.sin(angle)];
  });

  setInterval(() => {
    vehicles.forEach((vehicle, index) => {
      if (vehicle && vehicle.location) {
        simulateVehicleMovement(vehicle.id, directions[index]);
      }
    });
  }, 100); // Update every 100 milliseconds

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