import React, { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './index.css';
import { carSvg } from './carIcon';

// Set your Mapbox token
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;


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

    // Add navigation control (zoom in/out)
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

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
    return [-Math.cos(angle), -Math.sin(angle)];
  });

  setInterval(() => {
    vehicles.forEach((vehicle, index) => {
      if (vehicle && vehicle.location) {
        simulateVehicleMovement(vehicle.id, directions[index]);
      }
    });
  }, 100); 

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