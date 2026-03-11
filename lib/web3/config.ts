import { http, createConfig } from "wagmi";
import { polygon } from "wagmi/chains";
import { injected, walletConnect, coinbaseWallet } from "wagmi/connectors";

const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

export const wagmiConfig = createConfig({
  chains: [polygon],
  connectors: [
    injected(),
    ...(WC_PROJECT_ID
      ? [
          walletConnect({ projectId: WC_PROJECT_ID }),
          coinbaseWallet({ appName: "NEXUS Intelligence" }),
        ]
      : []),
  ],
  transports: {
    [polygon.id]: http(),
  },
  ssr: true,
});
