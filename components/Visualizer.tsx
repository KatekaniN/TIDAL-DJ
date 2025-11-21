import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  isActive: boolean;
  mode: 'voice' | 'music';
}

const Visualizer: React.FC<VisualizerProps> = ({ isActive, mode }) => {
  // We'll use a CSS-based fake visualizer for stability and aesthetics, 
  // as connecting real AnalyserNodes to simulated streams is complex in this scope.
  
  const barCount = 20;
  const bars = Array.from({ length: barCount });

  return (
    <div className="flex items-end justify-center gap-1 h-16 w-full">
      {bars.map((_, i) => (
        <div
          key={i}
          className={`w-2 rounded-t-md transition-all duration-300 ${
            mode === 'voice' ? 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'bg-fuchsia-500 shadow-[0_0_10px_rgba(217,70,239,0.5)]'
          }`}
          style={{
            height: isActive ? `${Math.random() * 100}%` : '10%',
            animation: isActive ? `wave ${0.5 + Math.random() * 0.5}s ease-in-out infinite` : 'none',
            animationDelay: `-${Math.random()}s`
          }}
        />
      ))}
    </div>
  );
};

export default Visualizer;