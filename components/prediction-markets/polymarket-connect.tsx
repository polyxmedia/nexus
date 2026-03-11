"use client";

import { useState, useEffect } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Wallet, Loader2, X, Check } from "lucide-react";

export function PolymarketConnect() {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [savedAddress, setSavedAddress] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showConnectors, setShowConnectors] = useState(false);

  // Load saved address on mount
  useEffect(() => {
    fetch("/api/prediction-markets/wallet")
      .then((r) => r.json())
      .then((d) => setSavedAddress(d.address || null))
      .catch(() => {});
  }, []);

  // Auto-save when wallet connects
  useEffect(() => {
    if (isConnected && address && address.toLowerCase() !== savedAddress?.toLowerCase()) {
      setSaving(true);
      fetch("/api/prediction-markets/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.success) setSavedAddress(d.address);
        })
        .catch(() => {})
        .finally(() => setSaving(false));
    }
  }, [isConnected, address, savedAddress]);

  const handleDisconnect = async () => {
    disconnect();
    await fetch("/api/prediction-markets/wallet", { method: "DELETE" });
    setSavedAddress(null);
    setShowConnectors(false);
  };

  const isConfigured = !!savedAddress;

  return (
    <div className="border border-navy-700 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-navy-800 flex items-center justify-center text-xs font-mono font-bold text-navy-400">PM</div>
          <div>
            <h3 className="text-sm font-medium text-navy-200">Polymarket</h3>
            <p className="text-[10px] text-navy-500">
              {isConfigured
                ? `Connected: ${savedAddress!.slice(0, 6)}...${savedAddress!.slice(-4)}`
                : "Connect your Polygon wallet to trade"}
            </p>
          </div>
        </div>

        {isConfigured ? (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[10px] font-mono text-accent-emerald">
              <Check className="h-3 w-3" /> Connected
            </span>
            <button
              onClick={handleDisconnect}
              className="text-[10px] font-mono text-navy-600 hover:text-accent-rose transition-colors px-2 py-1"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowConnectors(!showConnectors)}
            className="flex items-center gap-2 text-[10px] font-mono text-accent-cyan px-3 py-1.5 rounded border border-accent-cyan/30 hover:bg-accent-cyan/10 transition-colors"
          >
            <Wallet className="h-3 w-3" />
            Connect Wallet
          </button>
        )}
      </div>

      {showConnectors && !isConfigured && (
        <div className="px-4 pb-4 space-y-2">
          <p className="text-[10px] text-navy-500 font-sans mb-2">
            Your private key never leaves your browser. Transactions are signed locally in your wallet.
          </p>
          {connectors.map((connector) => (
            <button
              key={connector.uid}
              onClick={() => connect({ connector })}
              disabled={isPending}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded border border-navy-700/40 bg-navy-900/40 hover:bg-navy-800/40 hover:border-navy-600/40 transition-colors text-left"
            >
              <Wallet className="h-3.5 w-3.5 text-navy-500 shrink-0" />
              <span className="text-[11px] font-mono text-navy-300">{connector.name}</span>
              {isPending && <Loader2 className="h-3 w-3 animate-spin text-navy-500 ml-auto" />}
            </button>
          ))}
          {saving && (
            <p className="text-[9px] font-mono text-navy-500 flex items-center gap-1">
              <Loader2 className="h-2.5 w-2.5 animate-spin" /> Saving wallet address...
            </p>
          )}
        </div>
      )}
    </div>
  );
}
