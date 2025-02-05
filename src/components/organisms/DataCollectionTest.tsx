// import { useState } from "react";
// import { useMedusa } from "@/lib/medusa/context";
// import { DataCollectionAgent } from "@/lib/medusa/agents/dataCollectionAgent";

// export function DataCollectionTest() {
//   const bridge = useMedusa();
//   const [result, setResult] = useState<string>("");

//   const testDataCollection = async () => {
//     try {
//       const agent = new DataCollectionAgent(bridge);
//       await agent.initialize();
//       await agent.execute({
//         deviceId: "test-device-1",
//         data: {
//           temperature: 25,
//           humidity: 60,
//           timestamp: Date.now(),
//         },
//       });
//       setResult("Data collection successful");
//     } catch (error) {
//       setResult(`Error: ${error.message}`);
//     }
//   };

//   return (
//     <div className="p-4">
//       <button
//         onClick={testDataCollection}
//         className="bg-blue-500 text-white px-4 py-2 rounded"
//       >
//         Test Data Collection
//       </button>
//       <div className="mt-4">{result}</div>
//     </div>
//   );
// }
