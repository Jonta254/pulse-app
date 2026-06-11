// Unwrap the treasury wallet's WETH on World Chain into native ETH (gas).
//
// Why this exists: a World App "ETH" transfer arrived as WETH (ERC-20), which
// cannot pay for gas. withdraw() converts it 1:1 into native ETH.
//
//   Dry run (shows the plan, sends nothing):  node scripts/unwrap-weth.js
//   Execute:                                  node scripts/unwrap-weth.js --yes

const fs = require("fs");
const path = require("path");
const { createPublicClient, createWalletClient, http, formatEther, parseAbi } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const { worldchain } = require("viem/chains");

const WETH = "0x4200000000000000000000000000000000000006"; // canonical OP-stack WETH
const RPC = "https://worldchain-mainnet.g.alchemy.com/public";

const wethAbi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function withdraw(uint256 wad)",
]);

async function main() {
  const execute = process.argv.includes("--yes");

  const envFile = fs.readFileSync(path.join(__dirname, "..", ".env.treasury.local"), "utf8");
  const pkLine = envFile.split(/\r?\n/).find((l) => l.startsWith("TREASURY_PAYOUT_PRIVATE_KEY="));
  if (!pkLine) throw new Error(".env.treasury.local is missing TREASURY_PAYOUT_PRIVATE_KEY");
  const account = privateKeyToAccount(pkLine.split("=")[1].trim());

  const publicClient = createPublicClient({ chain: worldchain, transport: http(RPC) });

  const [wethBal, ethBal] = await Promise.all([
    publicClient.readContract({ address: WETH, abi: wethAbi, functionName: "balanceOf", args: [account.address] }),
    publicClient.getBalance({ address: account.address }),
  ]);

  console.log("Treasury wallet :", account.address);
  console.log("WETH to unwrap  :", formatEther(wethBal), "WETH");
  console.log("Native ETH now  :", formatEther(ethBal), "ETH");

  if (wethBal === 0n) { console.log("Nothing to unwrap."); return; }
  if (!execute) { console.log("\nDry run only. Re-run with --yes to unwrap."); return; }

  const walletClient = createWalletClient({ account, chain: worldchain, transport: http(RPC) });
  const hash = await walletClient.writeContract({
    address: WETH,
    abi: wethAbi,
    functionName: "withdraw",
    args: [wethBal],
  });

  console.log("\nSent! tx:", hash);
  console.log("Track: https://worldscan.org/tx/" + hash);

  const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
  console.log("Status:", receipt.status);

  const after = await publicClient.getBalance({ address: account.address });
  console.log("Native ETH after:", formatEther(after), "ETH");
}

main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
