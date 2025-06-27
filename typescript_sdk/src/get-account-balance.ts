import {
  aptos,
  getAccountAddress,
  getNetworkName,
  isAccountConfigured,
} from "./config/aptos-client";

// Check if account is configured
if (!isAccountConfigured()) {
  console.error(
    "Error: APTOS_ACCOUNT_PRIVATE_KEY not configured in environment variables"
  );
  process.exit(1);
}

console.log("Network:", getNetworkName());
console.log("Your address:", getAccountAddress());

async function getAccountBalance() {
  try {
    console.log("Getting account balance...");

    const balance = await aptos.getAccountResource({
      accountAddress: getAccountAddress(),
      resourceType: "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>",
    });

    console.log("Account balance resource:", balance);
    if (balance.data) {
      const coinValue = (balance.data as any).coin.value;
      console.log("Balance in APT:", Number(coinValue) / Math.pow(10, 8));
    }
  } catch (error) {
    console.error("Error getting account balance:", error);
    throw error;
  }
}

async function main() {
  await getAccountBalance();
}

main().catch(console.error);
