// Client-side Polymarket trading via browser wallet (WalletConnect/MetaMask)
// Private key never touches the server. All signing happens in the user's browser.

"use client";

import { ClobClient, Side, OrderType } from "@polymarket/clob-client";

const POLY_HOST = "https://clob.polymarket.com";
const CHAIN_ID = 137; // Polygon mainnet

export interface PolymarketOrder {
  tokenId: string;
  price: number; // 0.01 - 0.99
  size: number;
  side: "buy" | "sell";
}

export interface PolymarketOrderResult {
  success: boolean;
  orderID?: string;
  status?: string;
  error?: string;
}

// Adapt a wagmi/viem walletClient to the signer interface that ClobClient expects
function toEthersSigner(walletClient: {
  account: { address: string };
  signTypedData: (args: {
    domain: Record<string, unknown>;
    types: Record<string, Array<{ name: string; type: string }>>;
    primaryType: string;
    message: Record<string, unknown>;
  }) => Promise<string>;
}) {
  return {
    _signTypedData: async (
      domain: Record<string, unknown>,
      types: Record<string, Array<{ name: string; type: string }>>,
      value: Record<string, unknown>
    ) => {
      // Find primary type (first key that isn't EIP712Domain)
      const primaryType = Object.keys(types).find((k) => k !== "EIP712Domain") || "Order";
      return walletClient.signTypedData({ domain, types, primaryType, message: value });
    },
    getAddress: () => Promise.resolve(walletClient.account.address),
  };
}

// Cache the authenticated client per session
let cachedClient: { client: ClobClient; address: string } | null = null;

export async function getPolymarketClient(walletClient: {
  account: { address: string };
  signTypedData: (args: {
    domain: Record<string, unknown>;
    types: Record<string, Array<{ name: string; type: string }>>;
    primaryType: string;
    message: Record<string, unknown>;
  }) => Promise<string>;
}): Promise<{ client: ClobClient; address: string }> {
  const address = walletClient.account.address;

  // Return cached if same address
  if (cachedClient && cachedClient.address === address) return cachedClient;

  const signer = toEthersSigner(walletClient);

  // Derive L2 API credentials (user signs a message in their wallet)
  const tempClient = new ClobClient(POLY_HOST, CHAIN_ID, signer);
  const apiCreds = await tempClient.createOrDeriveApiKey();

  // Create fully authenticated client
  const client = new ClobClient(
    POLY_HOST,
    CHAIN_ID,
    signer,
    apiCreds,
    0, // EOA signature type
    address,
  );

  cachedClient = { client, address };
  return cachedClient;
}

export async function placeOrder(
  walletClient: Parameters<typeof getPolymarketClient>[0],
  order: PolymarketOrder
): Promise<PolymarketOrderResult> {
  const { client } = await getPolymarketClient(walletClient);

  const sideEnum = order.side === "buy" ? Side.BUY : Side.SELL;

  // Fetch tick size and neg risk for this token
  type TickSize = "0.1" | "0.01" | "0.001" | "0.0001";
  let tickSize: TickSize = "0.01";
  let negRisk = false;
  try {
    tickSize = await client.getTickSize(order.tokenId);
    negRisk = await client.getNegRisk(order.tokenId);
  } catch {
    // Use defaults
  }

  const result = await client.createAndPostOrder(
    {
      tokenID: order.tokenId,
      price: order.price,
      size: order.size,
      side: sideEnum,
    },
    { tickSize, negRisk },
    OrderType.GTC,
  );

  return {
    success: !!result?.orderID,
    orderID: result?.orderID,
    status: result?.status,
  };
}

export async function cancelOrder(
  walletClient: Parameters<typeof getPolymarketClient>[0],
  orderId: string
): Promise<void> {
  const { client } = await getPolymarketClient(walletClient);
  await client.cancelOrder({ orderID: orderId });
}

export async function getOpenOrders(
  walletClient: Parameters<typeof getPolymarketClient>[0]
): Promise<unknown[]> {
  const { client } = await getPolymarketClient(walletClient);
  try {
    return (await client.getOpenOrders()) || [];
  } catch {
    return [];
  }
}

// Positions can be fetched with just a public address (no signing needed)
export async function getPositions(address: string): Promise<unknown[]> {
  try {
    const res = await fetch(
      `https://data-api.polymarket.com/positions?user=${address}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

// Token ID helpers (no auth needed)
export function parseTokenIds(clobTokenIds: string): { yes: string; no: string } | null {
  try {
    const ids = JSON.parse(clobTokenIds);
    if (Array.isArray(ids) && ids.length >= 2) {
      return { yes: ids[0], no: ids[1] };
    }
  } catch { /* ignore */ }
  return null;
}
