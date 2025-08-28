import { analyzeWalletAssets } from "./get-wallet-assets";

// Get wallet address from command line arguments
function getWalletAddress(): string {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("❌ Error: Wallet address is required");
    console.log("Usage: npm run wallet-assets-cli <WALLET_ADDRESS>");
    console.log(
      "Example: npm run wallet-assets-cli 0xf0c680055d459b5f260672e03e0482077d1f61daa664d6369b0a00b368b309f3"
    );
    process.exit(1);
  }

  const walletAddress = args[0];

  // Basic validation
  if (!walletAddress.startsWith("0x") || walletAddress.length !== 66) {
    console.error("❌ Error: Invalid wallet address format");
    console.log(
      "Wallet address should be a 64-character hex string starting with 0x"
    );
    process.exit(1);
  }

  return walletAddress;
}

// Main execution
async function main() {
  try {
    const walletAddress = getWalletAddress();

    console.log(`🎯 Analyzing wallet: ${walletAddress}`);

    const summary = await analyzeWalletAssets(walletAddress);

    console.log("🎉 Wallet analysis completed successfully!");

    // Optionally save results to file with wallet address in filename
    // const filename = `./wallet-assets-${walletAddress.slice(0, 10)}.json`;
    // await fs.writeFile(filename, JSON.stringify(summary, null, 2));
    // console.log(`💾 Results saved to: ${filename}`);
  } catch (error) {
    console.error("💥 Error in main:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});














