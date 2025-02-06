"use client";

import { useState, useEffect } from "react";
// import { useMedusa } from "@/lib/medusa/context";

export function WalletTest() {
  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchWallets = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/medusa/wallets");
      const data = await res.json();
      setWallets(data.data);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const createWallet = async () => {
    try {
      setLoading(true);
      const res: any = await fetch("/api/medusa/wallets", {
        method: "POST",
        body: JSON.stringify({ chainType: "ethereum" }),
      });
      const data: any = await res.json();
      setWallets((prev) => [...prev, data]);
    } catch (error) {
      setError((error as any).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Wallet Management</h2>
      <div className="space-y-4">
        <button
          onClick={createWallet}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Create New Wallet
        </button>

        <div className="mt-4">
          <h3 className="font-medium mb-2">Your Wallets:</h3>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="space-y-2">
              {wallets.map((wallet: any) => (
                <div key={wallet.id} className="p-2 border rounded">
                  <p>Address: {wallet.address}</p>
                  <p>ID: {wallet.id}</p>
                  <p>Chain: {wallet.chain_type}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
