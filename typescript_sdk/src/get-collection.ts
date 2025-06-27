import {
  aptos,
  account,
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

async function getCollection(collectionName: string) {
  try {
    console.log("Getting collection data for:", collectionName);

    const collection = await aptos.getCollectionData({
      creatorAddress: account.accountAddress,
      collectionName,
    });
    console.log("Collection data:", collection);
  } catch (error) {
    console.error("Error getting collection:", error);
    throw error;
  }
}

async function main() {
  const collectionName = "UFCPACKS";
  await getCollection(collectionName);
}

main().catch(console.error);
