// Withdraw VeRdex profit from the treasury — liability-safe.
//
// Asks the production revenue endpoint how much WLD can leave the treasury
// while keeping every open bet and queued payout fully covered, then sends
// that amount (or less) to your wallet.
//
//   Dry run:  node scripts/withdraw-revenue.js 0xYourWallet
//   Execute:  node scripts/withdraw-revenue.js 0xYourWallet --yes
//   Partial:  node scripts/withdraw-revenue.js 0xYourWallet 5 --yes   (5 WLD)

const fs = require("fs");
const path = require("path");
const { createPublicClient, createWalletClient, http, erc20Abi, parseUnits } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const { worldchain } = require("viem/chains");

const APP = "https://pulse-app-zeta-virid.vercel.app";
const WLD = "0x2cfc85d8e48f8eab294be644d9e25c3030863003";
const RPC = "https://worldchain-mainnet.g.alchemy.com/public";

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== "--yes");
  const execute = process.argv.includes("--yes");
  const dest = args[0];
  const requested = args[1] ? Number(args[1]) : null;

  if (!dest || !/^0x[a-fA-F0-9]{40}$/.test(dest)) {
    throw new Error("Usage: node scripts/withdraw-revenue.js 0xDestinationWallet [amountWld] [--yes]");
  }

  const envFile = fs.readFileSync(path.join(__dirname, "..", ".env.treasury.local"), "utf8");
  const get = (k) => envFile.split(/\r?\n/).find((l) => l.startsWith(k + "="))?.split("=")[1]?.trim();
  const secret = get("CRON_SECRET");
  const pk = get("TREASURY_PAYOUT_PRIVATE_KEY");
  if (!secret || !pk) throw new Error(".env.treasury.local missing CRON_SECRET or TREASURY_PAYOUT_PRIVATE_KEY");

  const res = await fetch(`${APP}/api/predictions/revenue`, { headers: { Authorization: `Bearer ${secret}` } });
  const rev = await res.json();
  if (!rev.ok) throw new Error("Revenue endpoint failed: " + (rev.error ?? res.status));

  console.log("Treasury WLD     :", rev.treasury?.wldBalance);
  console.log("Open stakes      :", rev.openStakesWld, "WLD (must stay)");
  console.log("Owed payouts     :", rev.owedPayoutsWld, "WLD (must stay)");
  console.log("Lifetime paid out:", rev.lifetimePaidWld, "WLD");
  console.log("SAFE TO WITHDRAW :", rev.safeWithdrawWld, "WLD");

  let amount = requested ?? rev.safeWithdrawWld;
  if (amount > rev.safeWithdrawWld) {
    console.log(`Requested ${amount} exceeds safe limit — capping at ${rev.safeWithdrawWld}.`);
    amount = rev.safeWithdrawWld;
  }
  if (!(amount > 0)) { console.log("Nothing safely withdrawable right now."); return; }

  console.log(`\nPlan: send ${amount} WLD -> ${dest}`);
  if (!execute) { console.log("Dry run only. Re-run with --yes to send."); return; }

  const account = privateKeyToAccount(pk.startsWith("0x") ? pk : "0x" + pk);
  const publicClient = createPublicClient({ chain: worldchain, transport: http(RPC) });
  const walletClient = createWalletClient({ account, chain: worldchain, transport: http(RPC) });

  const hash = await walletClient.writeContract({
    address: WLD, abi: erc20Abi, functionName: "transfer",
    args: [dest, parseUnits(amount.toFixed(4), 18)],
  });
  console.log("Sent! tx:", hash);
  console.log("Track: https://worldscan.org/tx/" + hash);
  const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120000 });
  console.log("Status:", receipt.status);
}

main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
