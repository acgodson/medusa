import React from "react";
import { createAvatar } from "@dicebear/core";
import { bottts } from "@dicebear/collection";

interface AgentAvatarProps {
  seed: string;
  width?: number;
  height?: number;
  className?: string;
}

const AgentAvatar = ({
  seed,
  width = 40,
  height = 40,
  className = "",
}: AgentAvatarProps) => {
  const avatar = createAvatar(bottts, {
    seed,
    size: 40,
    backgroundColor: ["fef2f2"],
  });

  const svg = avatar.toString();

  return (
    <div
      className={`inline-block ${className}`}
      style={{ width, height }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

export default AgentAvatar;
