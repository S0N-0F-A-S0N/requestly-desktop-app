import util from "util";
import { exec as _exec } from "child_process";

const exec = util.promisify(_exec);

export async function startWireGuard(configPath: string): Promise<void> {
  if (!configPath) {
    throw new Error("WireGuard config path not provided");
  }
  await exec(`wg-quick up ${configPath}`);
}

export async function stopWireGuard(configPath: string): Promise<void> {
  if (!configPath) {
    throw new Error("WireGuard config path not provided");
  }
  await exec(`wg-quick down ${configPath}`);
}
