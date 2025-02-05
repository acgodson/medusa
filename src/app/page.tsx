import { MedusaProvider } from "@/providers/MedusaProvider";
// import { DataCollectionTest } from "@/components/organisms/DataCollectionTest";
// import { RewardTest } from "@/components/organisms/RewardTest";

export default function Home() {
  return (
    <MedusaProvider>
      <main className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Medusa Test Dashboard</h1>
        <div className="grid gap-4">
          {/* <DataCollectionTest />
          <RewardTest /> */}
        </div>
      </main>
    </MedusaProvider>
  );
}
