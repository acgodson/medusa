import React from "react";

const VersionBanner = () => {
  return (
    <div className="w-full pt-16 md:pt-20 z-40 bg-emerald-50/90 backdrop-blur-sm border-b border-emerald-200">
      <div className="flex items-center justify-between px-6 py-1.5">
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center rounded-md bg-emerald-900/10 px-2 py-1 text-xs font-medium text-emerald-900 ring-1 ring-inset ring-emerald-900/20">
            <span className="mr-1 h-2 w-2 rounded-full bg-emerald-400"></span>
            Live v0.0.1
          </span>
        </div>

        <a
          href={`https://testnet.bscscan.com/address/${process.env.NEXT_PUBLIC_REGISTRY_CONTRACT}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10 hover:bg-gray-100 transition-colors duration-200"
        >
          MedusaRegistry Testnet v1.0.0
          <svg
            className="ml-1 h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      </div>
    </div>
  );
};

export default VersionBanner;
