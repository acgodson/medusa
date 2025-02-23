import React, { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Volume2,
  Award,
  AlertCircle,
  HelpCircle,
  Footprints,
} from "lucide-react";

const baseHints = [
  {
    id: "noise-guide",
    title: "How to Record Quality Noise Data",
    description: "Learn best practices for noise data collection",
    icon: Volume2,
    content: `
      <div class="space-y-6">
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-4">Recording Best Practices</h3>
          <ul class="space-y-3">
            <li class="flex items-start gap-3">
              <span class="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-red-600 mt-2"></span>
              <span>Keep your device in a stable position during recording</span>
            </li>
            <li class="flex items-start gap-3">
              <span class="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-red-600 mt-2"></span>
              <span>Avoid direct conversation near the device</span>
            </li>
            <li class="flex items-start gap-3">
              <span class="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-red-600 mt-2"></span>
              <span>Record at different times of day for better data diversity</span>
            </li>
          </ul>
        </section>
      </div>
    `,
  },
  {
    id: "getting-started",
    title: "Getting Started Guide",
    description: "Quick steps to begin your journey",
    icon: HelpCircle,
    content: `
      <div class="space-y-6">
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-4">Quick Start Steps</h3>
          <ul class="space-y-3">
            <li class="flex items-start gap-3">
              <span class="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-red-600 mt-2"></span>
              <span>Join a workflow by creating an agent with a unique address</span>
            </li>
            <li class="flex items-start gap-3">
              <span class="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-red-600 mt-2"></span>
              <span>Your account will mint a device NFT for future claims</span>
            </li>
          </ul>
        </section>
      </div>
    `,
  },
  {
    id: "rewards",
    title: "Understanding Rewards",
    description:
      "Learn about our reward structure and how to maximize your earnings",
    icon: Award,
    content: `
      <div class="space-y-6">
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-4">Reward System</h3>
          <ul class="space-y-3">
            <li class="flex items-start gap-3">
              <span class="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-red-600 mt-2"></span>
              <span>Rewards are based on data quality and quantity</span>
            </li>
            <li class="flex items-start gap-3">
              <span class="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-red-600 mt-2"></span>
              <span>Consistent contributions earn bonus rewards</span>
            </li>
          </ul>
        </section>
      </div>
    `,
  },
  {
    id: "movement-tips",
    title: "Recording & Movement",
    description: "Essential tips for smooth and effective data recording",
    icon: Footprints,
    content: `
      <div class="space-y-6">
        <section>
          <h3 class="text-xl font-semibold text-gray-900 mb-4">Movement Guidelines</h3>
          <ul class="space-y-3">
            <li class="flex items-start gap-3">
              <span class="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-red-600 mt-2"></span>
              <span>Recording pauses after reaching stationary points limit</span>
            </li>
            <li class="flex items-start gap-3">
              <span class="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-red-600 mt-2"></span>
              <span>Resume by moving to a new location</span>
            </li>
          </ul>
        </section>
      </div>
    `,
  },
];

const HelpfulHints = () => {
  const [openHintId, setOpenHintId] = useState<any | null>(null);
  const [selectedHint, setSelectedHint] = useState<any | null>(null);
  const [hints, setHints] = useState(baseHints);

  useEffect(() => {
    const loadNewsletter = async () => {
      try {
        const response = await fetch("/email.html");
        const html = await response.text();
        setHints([
          ...baseHints,
          {
            id: "latest-updates",
            title: "Latest Updates",
            description: "Stay informed about new features and changes",
            icon: AlertCircle,
            content: html,
          },
        ]);
      } catch (error) {
        console.error("Error loading newsletter:", error);
      }
    };

    loadNewsletter();
  }, []);

  const scrollContainer = (direction: any) => {
    const container = document.getElementById("hints-container");
    if (container) {
      container.scrollBy({
        left: direction === "left" ? -280 : 280,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="relative my-6 -mx-6 md:mx-0">
      <div className="flex items-center">
        <button
          className="absolute left-2 md:-left-3 z-10 p-2 rounded-full bg-white shadow-md hover:bg-gray-50"
          onClick={() => scrollContainer("left")}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div
          id="hints-container"
          className="flex overflow-x-auto gap-4 px-6 pb-4 md:px-6 snap-x snap-mandatory"
          style={{ scrollbarWidth: "none" }}
        >
          {hints.map((hint) => {
            const Icon = hint.icon;
            return (
              <div
                key={hint.id}
                className="flex-none w-[85vw] md:w-[280px] p-4 cursor-pointer bg-gray-100 hover:bg-gray-50 transition-colors rounded-lg border border-black shadow-xs snap-start"
                onClick={() => {
                  setSelectedHint(hint);
                  setOpenHintId(hint.id);
                }}
              >
                <div className="space-y-3">
                  <div className="inline-flex p-2 rounded-lg bg-red-50">
                    <Icon className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-gray-900">
                      {hint.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {hint.description}
                    </p>
                  </div>
                  <div className="flex items-center text-sm text-red-600">
                    Learn more
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          className="absolute right-2 md:-right-3 z-10 p-2 rounded-full bg-white shadow-md hover:bg-gray-50"
          onClick={() => scrollContainer("right")}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {selectedHint && (
        <div
          className={`fixed inset-0 z-50 bg-black bg-opacity-50 transition-opacity ${
            openHintId ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          onClick={() => setOpenHintId(null)}
        >
          <div
            className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-50 rounded-lg">
                    <selectedHint.icon className="h-5 w-5 text-red-600" />
                  </div>
                  <h2 className="text-xl font-medium">{selectedHint.title}</h2>
                </div>
                <button
                  onClick={() => setOpenHintId(null)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedHint.content }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpfulHints;
