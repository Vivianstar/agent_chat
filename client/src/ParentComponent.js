import React, { useState, useEffect } from 'react';
import MapView from './MapView';

const ParentComponent = () => {
  const [currentLocation, setCurrentLocation] = useState([40.7128, -74.0060]);

  // Example: Update coordinates every few seconds
  useEffect(() => {
    const simulateMovement = () => {
      // Simulate movement by slightly adjusting coordinates
      setCurrentLocation(prev => [
        prev[0] + (Math.random() - 0.5) * 0.001,
        prev[1] + (Math.random() - 0.5) * 0.001
      ]);
    };

    const interval = setInterval(simulateMovement, 3000);
    return () => clearInterval(interval);
  }, []);

  return <MapView coordinates={currentLocation} />;
};

export default ParentComponent; 