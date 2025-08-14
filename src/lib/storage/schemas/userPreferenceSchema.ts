import { DEFAULT_PROXY_PORT, DEFAULT_LOCAL_FILE_LOG_CONFIG } from "../constants";

export const userPreferenceSchema = {
  defaultPort: {
    type: "number",
    default: DEFAULT_PROXY_PORT
  },

  localFileLogConfig: {
    type: "object",
    properties: {
      isEnabled: {
        type: "boolean",
      },
      storePath: {
        type: "string",
      },
      filter: {
        type: "array",
        items: {
          type: "string",
        },
      },
    },
    default: DEFAULT_LOCAL_FILE_LOG_CONFIG,
  },
  proxyChains: {
    type: "array",
    items: {
      type: "object",
      properties: {
        name: { type: "string" },
        endpoints: { type: "array", items: { type: "string" } },
        strategy: { type: "string" },
      },
      required: ["name", "endpoints"],
    },
    default: [],
  },
  wireguardConfigs: {
    type: "array",
    items: {
      type: "object",
      properties: {
        name: { type: "string" },
        configPath: { type: "string" },
      },
      required: ["name", "configPath"],
    },
    default: [],
  },
  routeOverrides: {
    type: "array",
    items: {
      type: "object",
      properties: {
        hostPattern: { type: "string" },
        proxyChain: { type: "string" },
        vpn: { type: "string" },
      },
      required: ["hostPattern"],
    },
    default: [],
  },
}