"use client";

import { trpc } from "@/trpc/client";
import { useState } from "react";

export function DataCollectionTest() {
  const [deviceId, setDeviceId] = useState("");
  const [temperature, setTemperature] = useState("");
  const [humidity, setHumidity] = useState("");
  const [result, setResult] = useState<string>("");

  const collectData = trpc.collectData.useMutation({
    onSuccess: (data) => {
      setResult(
        ""
        // `Data collection successful. Result: ${JSON.stringify(data.result)}`
      );
    },
    onError: (error) => {
      setResult(`Error: ${error.message}`);
    },
  });

  const handleSubmit = async () => {
    if (!deviceId || !temperature || !humidity) {
      setResult("Please fill in all fields");
      return;
    }

    collectData.mutate({
      deviceId,
      data: {
        temperature: parseFloat(temperature),
        humidity: parseFloat(humidity),
        timestamp: Date.now(),
      },
    });
  };

  return (
    <div className="p-4 border rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Test Data Collection</h2>
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Device ID"
          className="w-full p-2 border rounded"
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
        />
        <input
          type="number"
          placeholder="Temperature"
          className="w-full p-2 border rounded"
          value={temperature}
          onChange={(e) => setTemperature(e.target.value)}
        />
        <input
          type="number"
          placeholder="Humidity"
          className="w-full p-2 border rounded"
          value={humidity}
          onChange={(e) => setHumidity(e.target.value)}
        />
        <button
          onClick={handleSubmit}
          disabled={collectData.isPending}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-blue-300"
        >
          {collectData.isPending ? "Processing..." : "Test Data Collection"}
        </button>
        <pre className="mt-4 whitespace-pre-wrap">{result}</pre>
      </div>
    </div>
  );
}
