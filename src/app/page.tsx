import { MedusaProvider } from "@/providers/MedusaProvider";
import { DataCollectionTest } from "@/components/organisms/DataCollectionTest";
import { WalletTest } from "@/components/organisms/WalletTest";

export default function Home() {
  return (
    <MedusaProvider>
      <main className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Medusa Test Dashboard</h1>
        <div className="grid gap-4">
          <WalletTest />
          <DataCollectionTest />
          {/* <RewardTest /> */}
        </div>
      </main>
    </MedusaProvider>
  );
}
