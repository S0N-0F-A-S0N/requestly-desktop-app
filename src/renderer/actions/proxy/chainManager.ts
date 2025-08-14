export interface ProxyChain {
  name: string;
  endpoints: string[];
  strategy?: "round-robin" | "random";
}

interface ChainState {
  endpoints: string[];
  index: number;
  strategy: "round-robin" | "random";
}

class ProxyChainManager {
  private chains: Record<string, ChainState> = {};

  constructor(chains: ProxyChain[] = []) {
    chains.forEach((chain) => {
      this.chains[chain.name] = {
        endpoints: chain.endpoints,
        index: 0,
        strategy: chain.strategy || "round-robin",
      };
    });
  }

  getNextEndpoint(chainName: string): string | undefined {
    const chain = this.chains[chainName];
    if (!chain || chain.endpoints.length === 0) {
      return undefined;
    }

    if (chain.strategy === "random") {
      const idx = Math.floor(Math.random() * chain.endpoints.length);
      return chain.endpoints[idx];
    }

    const endpoint = chain.endpoints[chain.index % chain.endpoints.length];
    chain.index = (chain.index + 1) % chain.endpoints.length;
    return endpoint;
  }
}

export default ProxyChainManager;
