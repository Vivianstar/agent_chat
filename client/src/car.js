import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Car, MapPin } from 'lucide-react';

const MapGrid = () => {
  const gridSize = 40;
  const lines = [];
  
  // Generate horizontal lines
  for (let i = 0; i < 15; i++) {
    lines.push(
      <line 
        key={`h${i}`} 
        x1="0" 
        y1={i * gridSize} 
        x2="800" 
        y2={i * gridSize} 
        stroke="#e2e8f0" 
        strokeWidth="1"
      />
    );
  }
  
  // Generate vertical lines
  for (let i = 0; i < 20; i++) {
    lines.push(
      <line 
        key={`v${i}`} 
        x1={i * gridSize} 
        y1="0" 
        x2={i * gridSize} 
        y2="600" 
        stroke="#e2e8f0" 
        strokeWidth="1"
      />
    );
  }
  
  return (
    <svg width="800" height="600" className="absolute inset-0">
      <rect width="800" height="600" fill="#f8fafc" />
      {lines}
      {Array.from({ length: 20 }).map((_, i) => (
        <rect
          key={`block${i}`}
          x={Math.random() * 700}
          y={Math.random() * 500}
          width={30 + Math.random() * 40}
          height={30 + Math.random() * 40}
          fill="#e2e8f0"
          opacity="0.5"
        />
      ))}
      <path
        d="M 0 200 H 800 M 300 0 V 600"
        stroke="#cbd5e1"
        strokeWidth="20"
        opacity="0.3"
      />
    </svg>
  );
};

const UberLikeMap = () => {
  const [vehicles, setVehicles] = useState([
    { id: 1, position: { x: 150, y: 200 }, type: 'car' },
    { id: 2, position: { x: 300, y: 150 }, type: 'car' }
  ]);
  
  const [destinations, setDestinations] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [targetPositions, setTargetPositions] = useState({});
  
  const animationFrameRef = useRef();
  const lastTimestampRef = useRef();

  const handleMapClick = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newDestination = {
      id: Date.now(),
      position: { x, y }
    };
    
    setDestinations(prev => [...prev, newDestination]);
    
    const nearestVehicle = vehicles[Math.floor(Math.random() * vehicles.length)];
    
    const controlPoint = {
      x: (nearestVehicle.position.x + x) / 2 + (Math.random() - 0.5) * 100,
      y: (nearestVehicle.position.y + y) / 2 + (Math.random() - 0.5) * 100
    };
    
    const newRoute = {
      id: Date.now(),
      vehicleId: nearestVehicle.id,
      points: [nearestVehicle.position, controlPoint, { x, y }]
    };
    
    setRoutes(prev => [...prev, newRoute]);
    setTargetPositions(prev => ({
      ...prev,
      [nearestVehicle.id]: { x, y }
    }));
  }, [vehicles]);

  const animate = useCallback((timestamp) => {
    if (!lastTimestampRef.current) {
      lastTimestampRef.current = timestamp;
    }

    const deltaTime = timestamp - lastTimestampRef.current;
    lastTimestampRef.current = timestamp;
    
    setVehicles(prevVehicles => 
      prevVehicles.map(vehicle => {
        const target = targetPositions[vehicle.id];
        if (!target) return vehicle;
        
        const speed = 0.002 * deltaTime;
        return {
          ...vehicle,
          position: {
            x: vehicle.position.x + (target.x - vehicle.position.x) * speed,
            y: vehicle.position.y + (target.y - vehicle.position.y) * speed
          }
        };
      })
    );

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [targetPositions]);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animate]);

  const getRotation = (vehicle) => {
    const target = targetPositions[vehicle.id];
    if (!target) return 0;
    const dx = target.x - vehicle.position.x;
    const dy = target.y - vehicle.position.y;
    return Math.atan2(dy, dx) * (180 / Math.PI);
  };

  const renderRoute = (points) => {
    if (points.length < 2) return '';
    const [start, control, end] = points;
    return `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`;
  };

  return (
    <div className="relative w-full h-96 bg-blue-50 overflow-hidden rounded-lg shadow-lg">
      <MapGrid />
      
      <svg width="800" height="600" className="absolute inset-0 pointer-events-none">
        {routes.map(route => (
          <g key={route.id}>
            <path
              d={renderRoute(route.points)}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="3"
              strokeDasharray="8,8"
              opacity="0.6"
            />
          </g>
        ))}
      </svg>
      
      <div 
        className="absolute inset-0 cursor-crosshair"
        onClick={handleMapClick}
      >
        {destinations.map(dest => (
          <div
            key={dest.id}
            className="absolute"
            style={{
              left: `${dest.position.x}px`,
              top: `${dest.position.y}px`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="relative">
              <MapPin className="text-red-500" size={24} />
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                <div className="animate-ping w-2 h-2 bg-red-400 rounded-full" />
              </div>
            </div>
          </div>
        ))}
        
        {vehicles.map(vehicle => (
          <div
            key={vehicle.id}
            className="absolute"
            style={{
              left: `${vehicle.position.x}px`,
              top: `${vehicle.position.y}px`,
              transform: `translate(-50%, -50%) rotate(${getRotation(vehicle)}deg)`
            }}
          >
            <div className="relative">
              <Car className="text-blue-600" size={28} />
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                <div className="animate-pulse w-2 h-2 bg-blue-400 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="absolute top-4 right-4 bg-white bg-opacity-90 p-4 rounded-lg shadow-lg">
        <h3 className="text-lg font-semibold mb-2">Interactive Map</h3>
        <p className="text-sm text-gray-600">Click anywhere to set a destination</p>
        <div className="mt-2 text-sm text-gray-500">
          <p>• Blue cars: Available vehicles</p>
          <p>• Red pins: Destinations</p>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 p-3 rounded-lg shadow-lg">
        <div className="text-sm space-y-1">
          <p>Active Vehicles: {vehicles.length}</p>
          <p>Active Routes: {routes.length}</p>
          <p>Pending Destinations: {destinations.length}</p>
        </div>
      </div>
    </div>
  );
};

export default UberLikeMap;