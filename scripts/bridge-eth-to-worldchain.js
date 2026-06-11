// Bridge the treasury wallet's Ethereum-mainnet ETH to World Chain.
//
// Why this exists: a Binance withdrawal landed on Ethereum mainnet instead of
// World Chain. This sends it through World Chain's official L1StandardBridge
// (address verified from docs.world.org/world-chain/developers/world-chain-contracts),
// crediting the SAME address on World Chain in ~1-3 minutes.
//
//   Dry run (shows the plan, sends nothing):  node scripts/bridge-eth-to-worldchain.js
//   Execute:                                  node scripts/bridge-eth-to-worldchain.js --yes

const fs = require("fs");
const path = require("path");
const { createPublicClient, createWalletClient, http, formatEther, parseAbi } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const { mainnet } = require("viem/chains");

const L1_STANDARD_BRIDGE = "0x470458C91978D2d929704489Ad730DC3E3001113"; // World Chain official, Ethereum mainnet
const MAINNET_RPC = "https://ethereum-rpc.publicnode.com";
// OP-stack deposits burn additional L1 gas proportional to the requested L2
// gas (ResourceMetering), so the L1 limit must be estimated, not hardcoded —
// a fixed 200k limit reverted out-of-gas on the first attempt.
const L2_MIN_GAS_LIMIT = 200000;        // gas forwarded for the L2 mint

const bridgeAbi = parseAbi([
  "function bridgeETHTo(address _to, uint32 _minGasLimit, bytes _extraData) payable",
]);

async function main() {
  const execute = process.argv.includes("--yes");

  const envFile = fs.readFileSync(path.join(__dirname, "..", ".env.treasury.local"), "utf8");
  const pkLine = envFile.split(/\r?\n/).find((l) => l.startsWith("TREASURY_PAYOUT_PRIVATE_KEY="));
  if (!pkLine) throw new Error(".env.treasury.local is missing TREASURY_PAYOUT_PRIVATE_KEY");
  const account = privateKeyToAccount(pkLine.split("=")[1].trim());

  const publicClient = createPublicClient({ chain: mainnet, transport: http(MAINNET_RPC) });

  const balance = await publicClient.getBalance({ address: account.address });
  const fees = await publicClient.estimateFeesPerGas();

  // Simulate with a placeholder value to learn the real gas need, then add 50%
  const estimated = await publicClient.estimateContractGas({
    address: L1_STANDARD_BRIDGE,
    abi: bridgeAbi,
    functionName: "bridgeETHTo",
    args: [account.address, L2_MIN_GAS_LIMIT, "0x"],
    account,
    value: balance / 2n,
  });
  const gasLimit = (estimated * 15n) / 10n;
  const gasReserve = (gasLimit * fees.maxFeePerGas * 15n) / 10n;
  const valueToBridge = balance - gasReserve;
  console.log("Estimated gas   :", estimated.toString(), "-> limit", gasLimit.toString());

  console.log("Treasury wallet :", account.address);
  console.log("Mainnet balance :", formatEther(balance), "ETH");
  console.log("Gas reserve     :", formatEther(gasReserve), "ETH");
  console.log("Will bridge     :", formatEther(valueToBridge), "ETH -> World Chain (same address)");
  console.log("Bridge contract :", L1_STANDARD_BRIDGE);

  if (valueToBridge <= 0n) {
    throw new Error("Balance too small to cover L1 gas. Top up mainnet ETH or wait for lower fees.");
  }

  if (!execute) {
    console.log("\nDry run only. Re-run with --yes to send.");
    return;
  }

  const walletClient = createWalletClient({ account, chain: mainnet, transport: http(MAINNET_RPC) });
  const hash = await walletClient.writeContract({
    address: L1_STANDARD_BRIDGE,
    abi: bridgeAbi,
    functionName: "bridgeETHTo",
    args: [account.address, L2_MIN_GAS_LIMIT, "0x"],
    value: valueToBridge,
    gas: gasLimit,
    maxFeePerGas: fees.maxFeePerGas,
    maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
  });

  console.log("\nSent! L1 tx:", hash);
  console.log("Track: https://etherscan.io/tx/" + hash);
  console.log("ETH arrives on World Chain at the same address in ~1-3 minutes.");

  const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 300_000 });
  console.log("L1 status:", receipt.status);
}

main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
