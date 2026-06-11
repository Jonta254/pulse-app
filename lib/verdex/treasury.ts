// ── Treasury payout engine (server-side only) ────────────────────────────────
// Sends real WLD ERC-20 transfers on World Chain from the treasury signer.
// Disabled unless TREASURY_PAYOUT_ENABLED=true AND a private key is configured.

import { createPublicClient, createWalletClient, erc20Abi, formatUnits, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { worldchain } from "viem/chains";

// WLD on World Chain — confirmed from World docs
export const WLD_TOKEN_ADDRESS = "0x2cfc85d8e48f8eab294be644d9e25c3030863003" as const;
export const WORLD_CHAIN_ID = 480;
const DEFAULT_RPC = "https://worldchain-mainnet.g.alchemy.com/public";
const WLD_DECIMALS = 18;

function getRpcUrl() {
  return process.env.WORLD_CHAIN_RPC_URL ?? DEFAULT_RPC;
}

function getTreasuryAccount() {
  const raw = process.env.TREASURY_PAYOUT_PRIVATE_KEY?.trim();
  if (!raw) return null;
  const key = raw.startsWith("0x") ? raw : `0x${raw}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(key)) return null;
  return privateKeyToAccount(key as `0x${string}`);
}

export function isTreasuryPayoutEnabled(): boolean {
  return process.env.TREASURY_PAYOUT_ENABLED === "true" && getTreasuryAccount() !== null;
}

export function treasuryDisabledReason(): string {
  if (process.env.TREASURY_PAYOUT_ENABLED !== "true") return "TREASURY_PAYOUT_ENABLED is not true.";
  if (!getTreasuryAccount()) return "TREASURY_PAYOUT_PRIVATE_KEY is missing or invalid.";
  return "";
}

function getPublicClient() {
  return createPublicClient({ chain: worldchain, transport: http(getRpcUrl()) });
}

export type TreasuryStatus = {
  address: string;
  wldBalance: number;
  ethBalance: number;
};

export async function getTreasuryStatus(): Promise<TreasuryStatus | null> {
  const account = getTreasuryAccount();
  if (!account) return null;
  const client = getPublicClient();

  const [wldRaw, ethRaw] = await Promise.all([
    client.readContract({
      address: WLD_TOKEN_ADDRESS,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [account.address],
    }),
    client.getBalance({ address: account.address }),
  ]);

  return {
    address: account.address,
    wldBalance: Number(formatUnits(wldRaw, WLD_DECIMALS)),
    ethBalance: Number(formatUnits(ethRaw, 18)),
  };
}

export type WldTransferResult =
  | { ok: true; txHash: string }
  | { ok: false; error: string };

export async function sendWldFromTreasury(to: string, amountWld: number): Promise<WldTransferResult> {
  const account = getTreasuryAccount();
  if (!account) return { ok: false, error: "Treasury signer not configured." };
  if (!/^0x[a-fA-F0-9]{40}$/.test(to)) return { ok: false, error: "Invalid recipient address." };
  if (!(amountWld > 0)) return { ok: false, error: "Invalid payout amount." };

  try {
    const publicClient = getPublicClient();
    const walletClient = createWalletClient({ account, chain: worldchain, transport: http(getRpcUrl()) });

    // Amounts are stored as NUMERIC(14,4) — 4dp is the canonical precision
    const value = parseUnits(amountWld.toFixed(4), WLD_DECIMALS);

    const hash = await walletClient.writeContract({
      address: WLD_TOKEN_ADDRESS,
      abi: erc20Abi,
      functionName: "transfer",
      args: [to as `0x${string}`, value],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
    if (receipt.status !== "success") {
      return { ok: false, error: `Transaction reverted: ${hash}` };
    }
    return { ok: true, txHash: hash };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "WLD transfer failed." };
  }
}
