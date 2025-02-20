import React from "react";

// Noise categories definitions
const noiseCategories = [
  { max: 25, color: "#90EE90", label: "Quiet" },
  { max: 30, color: "#FFFF00", label: "Moderate" },
  { max: 45, color: "#FFA500", label: "Moderately Loud" },
  { max: 79, color: "#FF0000", label: "Loud" },
  { max: Infinity, color: "#990000", label: "Very Loud" },
];

// Helper function to determine color based on reading
const getNoiseColor = (reading: number) => {
  for (let category of noiseCategories) {
    if (reading <= category.max) {
      return category.color;
    }
  }
  return noiseCategories[noiseCategories.length - 1].color;
};

interface DualSoundBarProgressProps {
  currentReading: number;
}

const DualSoundBarProgress = ({
  currentReading,
}: DualSoundBarProgressProps) => {
  // Calculate percentage of reading (assuming 100 is max value)
  // If your max value is different, adjust the calculation accordingly
  const maxReading = 100;
  const percentReading = Math.min(100, (currentReading / maxReading) * 100);
  const color = getNoiseColor(currentReading);

  return (
    <div className="relative w-[170.5px] h-[170.5px]">
      {/* Background circle */}
      <div className="absolute inset-0 rounded-full bg-transparent opacity-20"></div>

      {/* Left side arc - starts at bottom (90°) and goes counter-clockwise to top (270°) */}
      <div className="absolute left-0 top-0">
        <SemiCircleProgress
          value={percentReading}
          size="170.5px"
          thickness="10.8px"
          color={color}
          startAngle={90}
          endAngle={270}
          sweepFlag={0} // Counter-clockwise
        />
      </div>

      {/* Right side arc - starts at bottom (90°) and goes clockwise to top (270°) */}
      <div className="absolute right-0 top-0">
        <SemiCircleProgress
          value={percentReading}
          size="170.5px"
          thickness="10.8px"
          color={color}
          startAngle={90}
          endAngle={270}
          sweepFlag={1} // Clockwise
        />
      </div>
    </div>
  );
};

// Modified semi-circle progress component with customizable angles and sweep direction
interface SemiCircleProgressProps {
  value: number;
  size: string;
  thickness: string;
  color: string;
  startAngle: number;
  endAngle: number;
  sweepFlag: number; // 0 for counter-clockwise, 1 for clockwise
}

const SemiCircleProgress = ({
  value,
  size,
  thickness,
  color,
  startAngle,
  endAngle,
  sweepFlag,
}: SemiCircleProgressProps) => {
  // Convert size and thickness to numbers
  const sizeNum = parseFloat(size);
  const thicknessNum = parseFloat(thickness);

  // Calculate dimensions
  const radius = sizeNum / 2 - thicknessNum / 2;
  const center = sizeNum / 2;

  // Calculate the progress as a percentage (0-100)
  const normalizedValue = Math.min(100, Math.max(0, value));

  // Calculate the angle span
  const angleSpan =
    endAngle > startAngle ? endAngle - startAngle : 360 - startAngle + endAngle;

  // Calculate the circumference of the arc
  const circumference = (angleSpan / 360) * 2 * Math.PI * radius;

  // Calculate the dash offset based on the progress
  const dashOffset = circumference - (normalizedValue / 100) * circumference;

  // Convert angles to radians
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (endAngle * Math.PI) / 180;

  // Calculate start and end points
  const x1 = center + radius * Math.cos(startRad);
  const y1 = center + radius * Math.sin(startRad);
  const x2 = center + radius * Math.cos(endRad);
  const y2 = center + radius * Math.sin(endRad);

  // Large arc flag is 1 if angle > 180 degrees
  const largeArcFlag = angleSpan > 180 ? 1 : 0;

  // Path for the background track
  const bgPath = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${x2} ${y2}`;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${sizeNum} ${sizeNum}`}>
      {/* Background track */}
      <path
        d={bgPath}
        fill="none"
        // stroke="#D1D5DB" // Light gray for background
        strokeWidth={thickness}
        strokeLinecap="round"
      />

      {/* Progress arc */}
      <path
        d={bgPath}
        fill="none"
        stroke={color}
        strokeWidth={thickness}
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
      />
    </svg>
  );
};

export default DualSoundBarProgress;
