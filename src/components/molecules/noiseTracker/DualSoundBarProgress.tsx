import React, { useEffect, useState } from "react";

interface DualSoundBarProgressProps {
  currentReading: number;
}

export const DualSoundBarProgress: React.FC<DualSoundBarProgressProps> = ({
  currentReading,
}) => {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    // Convert dB reading to rotation degrees (0-100 maps to -90 to 90)
    const newRotation = (currentReading / 100) * 180 - 90;
    setRotation(Math.max(-90, Math.min(90, newRotation)));
  }, [currentReading]);

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div
        className="w-1 h-24 bg-red-600 origin-bottom transform transition-transform duration-200"
        style={{
          transform: `rotate(${rotation}deg)`,
          transformOrigin: "bottom center",
        }}
      />
    </div>
  );
};
