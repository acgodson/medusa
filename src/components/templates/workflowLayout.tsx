"use client";
import React from "react";

const WorkflowLayout = ({ children }: any) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-7xl mx-auto p-3 md:p-6 space-y-4 md:space-y-8">
        <div className="relative">
          {/* Layered Background */}
          <div className="absolute inset-0 bg-gradient-to-br backdrop-blur-2xl rounded-2xl"></div>
          <div className="absolute inset-0 bg-[#E6B24B]/5 mix-blend-overlay rounded-2xl"></div>
          <div className="absolute inset-0 border border-white/60 rounded-2xl"></div>
          {/* Content */}
          <div className="relative p-4 md:p-8">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowLayout;
