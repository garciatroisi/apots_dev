import { Account } from "@aptos-labs/ts-sdk";
import {
  aptos,
  getAllAccounts,
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

// Manually define CreateCollectionOptions if not available
interface CreateCollectionOptions {
  maxSupply?: number;
  mutableDescription?: boolean;
  mutableRoyalty?: boolean;
  mutableURI?: boolean;
  mutableTokenDescription?: boolean;
  mutableTokenName?: boolean;
  mutableTokenProperties?: boolean;
  mutableTokenURI?: boolean;
  tokensBurnableByCreator?: boolean;
  tokensFreezableByCreator?: boolean;
  royaltyNumerator?: number;
  royaltyDenominator?: number;
  // Properties from InputGenerateTransactionOptions
  maxGasAmount?: number;
  gasUnitPrice?: number;
  expireTimestamp?: number;
  accountSequenceNumber?: number;
}

interface CreateCollectionResult {
  success: boolean;
  txHash?: string | undefined;
  collectionName?: string;
  error?: string;
}

async function createCollectionWithOptions(
  account: Account,
  name: string,
  description: string,
  uri: string,
  options: CreateCollectionOptions
): Promise<CreateCollectionResult> {
  let committedTxn;
  try {
    console.log(`🚀 Creating collection: ${name}`);
    console.log(`👤 Creator address: ${account.accountAddress.toString()}`);
    console.log(`📋 Collection options:`, options);

    // Create collection with options using aptosToken
    const transaction = await aptos.createCollectionTransaction({
      creator: account,
      description,
      name,
      uri,
      options,
    });

    console.log("📝 Transaction built successfully");

    committedTxn = await aptos.signAndSubmitTransaction({
      signer: account,
      transaction,
    });

    console.log("📤 Transaction submitted successfully");
    console.log(`🔗 Transaction hash: ${committedTxn.hash}`);

    await aptos.waitForTransaction({ transactionHash: committedTxn.hash });

    console.log("✅ Transaction confirmed successfully");
    console.log(`🎉 Collection created: ${name}`);
    console.log(`🔗 Transaction hash: ${committedTxn.hash}`);

    return {
      success: true,
      txHash: committedTxn.hash,
      collectionName: name,
    };
  } catch (error) {
    console.error("❌ Error creating collection:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      txHash: committedTxn?.hash || undefined,
      collectionName: name,
    };
  }
}

async function createUFCPacksCollection(
  account: Account
): Promise<CreateCollectionResult> {
  console.log("🥊 Creating UFC Packs Collection...");

  const collectionName = "UFCPACKS_BURNABLE";
  const description =
    "UFC Packs Collection - Official UFC digital collectibles and moments";
  const uri =
    "ipfs://bafkreih2cjeu5j4sufgp326iebcv4rj7iaj2dmtuf6cky4i2g5v3eee6ce";

  const options: CreateCollectionOptions = {
    maxSupply: 10000, // Maximum 10,000 tokens in the collection
    mutableDescription: true,
    mutableRoyalty: true,
    mutableURI: true,
    mutableTokenDescription: true,
    mutableTokenName: true,
    mutableTokenProperties: true,
    mutableTokenURI: true,
    tokensBurnableByCreator: false, // Creator can burn tokens
    tokensFreezableByCreator: false, // Creator cannot freeze tokens
    royaltyNumerator: 5, // 5% royalty
    royaltyDenominator: 100,
  };

  return await createCollectionWithOptions(
    account,
    collectionName,
    description,
    uri,
    options
  );
}

async function main() {
  console.log("🚀 Starting collection creation process...");

  // Get the account from configuration
  const account = getAllAccounts().creator;
  if (!account) {
    console.error("❌ No account configured");
    process.exit(1);
  }

  console.log(`👤 Using account: ${account.accountAddress.toString()}`);

  try {
    // Create UFC Packs Collection
    console.log("\n" + "=".repeat(50));
    const ufcPacksResult = await createUFCPacksCollection(account);

    if (ufcPacksResult.success) {
      console.log("✅ UFC Packs Collection created successfully!");
    } else {
      console.log(
        "❌ Failed to create UFC Packs Collection:",
        ufcPacksResult.error
      );
    }

    // Wait a bit before creating the next collection
    console.log("⏳ Waiting 3 seconds before creating next collection...");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Summary
    console.log("\n" + "=".repeat(50));
    console.log("📊 Collection Creation Summary:");
    console.log(
      `UFC Packs: ${ufcPacksResult.success ? "✅" : "❌"} ${
        ufcPacksResult.txHash || "N/A"
      }`
    );
  } catch (error) {
    console.error("💥 Fatal error in main:", error);
    process.exit(1);
  }
}

// Export functions for use in other modules
export {
  createCollectionWithOptions,
  createUFCPacksCollection,
  CreateCollectionOptions,
  CreateCollectionResult,
};

main().catch((error) => {
  console.error("💥 Fatal error:", error);
  process.exit(1);
});
