import { aptos, getNetworkName } from "./config/aptos-client";

// Configuration
const USER_ADDRESS =
  "0xf0c680055d459b5f260672e03e0482077d1f61daa664d6369b0a00b368b309f3";
const BATCH_SIZE = 100; // Number of tokens to fetch per request
const SHOW_DETAILED_INFO = true; // Set to false for faster execution with basic info only

interface WalletAsset {
  tokenId: string;
  tokenName: string;
  collectionAddress: string;
  tokenUri?: string;
  digitalAssetData?: any;
  error?: string;
}

interface WalletSummary {
  totalAssets: number;
  totalCollections: number;
  collections: Map<string, { name: string; count: number }>;
  assets: WalletAsset[];
}

// Simple delay utility for rate limiting if needed
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Get all digital assets owned by the wallet
async function getWalletAssets(userAddress: string): Promise<WalletSummary> {
  try {
    console.log(`🔍 Getting all assets for wallet: ${userAddress}`);

    let allAssets: any[] = [];
    let offset = 0;
    let assetsBatch: any[] = [];

    // Fetch all assets with pagination
    do {
      console.log(`Fetching batch starting at offset: ${offset}`);

      assetsBatch = await aptos.getOwnedDigitalAssets({
        ownerAddress: userAddress,
        options: {
          limit: BATCH_SIZE,
          offset: offset,
        },
      });

      allAssets = allAssets.concat(assetsBatch);
      console.log(
        `📊 Batch size: ${assetsBatch.length}, Total so far: ${allAssets.length}`
      );

      offset += assetsBatch.length;
    } while (assetsBatch.length === BATCH_SIZE);

    console.log(`📊 Found ${allAssets.length} total assets in wallet`);

    // Process assets and get detailed information
    const processedAssets = await processAssets(allAssets);

    // Create summary
    const collections = new Map<string, { name: string; count: number }>();

    processedAssets.forEach((asset) => {
      const collectionKey = asset.collectionAddress;
      if (collections.has(collectionKey)) {
        collections.get(collectionKey)!.count++;
      }
    });

    return {
      totalAssets: processedAssets.length,
      totalCollections: collections.size,
      collections,
      assets: processedAssets,
    };
  } catch (error) {
    console.error("❌ Error getting wallet assets:", error);
    throw error;
  }
}

// Process assets and get detailed information
async function processAssets(assets: any[]): Promise<WalletAsset[]> {
  console.log("🔧 Processing assets and getting detailed information...");

  const assetPromises = assets.map(async (asset) => {
    try {
      const baseAsset: WalletAsset = {
        tokenId: asset.token_data_id,
        tokenName: asset.current_token_data?.token_name || "Unknown",
        collectionAddress: asset.current_collection?.collection_id || "Unknown",
        tokenUri: asset.current_token_data?.token_uri || undefined,
      };

      // Get detailed digital asset data if enabled
      if (SHOW_DETAILED_INFO) {
        try {
          const digitalAssetData = await aptos.getDigitalAssetData({
            digitalAssetAddress: asset.token_data_id,
          });

          baseAsset.digitalAssetData = {
            tokenProperties: digitalAssetData.token_properties,
            tokenUri: digitalAssetData.token_uri,
            description: digitalAssetData.description,
            tokenName: digitalAssetData.token_name,
            collectionId: digitalAssetData.collection_id,
          };
        } catch (error) {
          console.error(
            `   ⚠️  Could not get detailed data for ${asset.token_data_id}:`,
            error
          );
          baseAsset.error =
            error instanceof Error ? error.message : "Unknown error";
        }
      }

      return baseAsset;
    } catch (error) {
      console.error(
        `   ❌ Error processing asset ${asset.token_data_id}:`,
        error
      );
      return {
        tokenId: asset.token_data_id,
        tokenName: asset.current_token_data?.token_name || "Unknown",
        collectionAddress: asset.current_collection?.collection_id || "Unknown",
        tokenUri: asset.current_token_data?.token_uri || undefined,
        amount: asset.amount || "1",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });

  const processedAssets = await Promise.all(assetPromises);
  console.log("✅ Assets processing completed");
  return processedAssets;
}

// Display wallet summary
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function displayWalletSummary(summary: WalletSummary, userAddress: string) {
  console.log("\n" + "=".repeat(80));
  console.log("👛 WALLET ASSETS SUMMARY");
  console.log("=".repeat(80));
  console.log(`👤 Wallet Address: ${userAddress}`);
  console.log(`📊 Total Assets: ${summary.totalAssets}`);
  console.log(`🏷️  Total Collections: ${summary.totalCollections}`);

  // Display collections summary
  console.log("\n📋 COLLECTIONS SUMMARY:");
  console.log("-".repeat(60));

  const sortedCollections = Array.from(summary.collections.entries()).sort(
    (a, b) => b[1].count - a[1].count
  ); // Sort by count descending

  sortedCollections.forEach(([address, info], index) => {
    console.log(`${index + 1}. ${info.name}`);
    console.log(`   Address: ${address}`);
    console.log(`   Assets: ${info.count}`);
    console.log("");
  });

  // Display detailed asset information
  if (summary.assets.length > 0) {
    console.log("\n🎯 ASSET DETAILS:");
    console.log("-".repeat(60));

    summary.assets.forEach((asset, index) => {
      console.log(`\n${index + 1}. ${asset.tokenName}`);

      if (asset.tokenUri) {
        console.log(`   URI: ${asset.tokenUri}`);
      }

      if (asset.digitalAssetData) {
        if (asset.digitalAssetData.tokenProperties) {
          // Show first few properties
          const firstProps = Object.entries(
            asset.digitalAssetData.tokenProperties
          ).slice(0, 3);
          firstProps.forEach(([key, value]) => {
            console.log(`${key}: ${JSON.stringify(value)}`);
          });
        }
      }

      if (asset.error) {
        console.log(`   ❌ Error: ${asset.error}`);
      }
    });
  }

  console.log("=".repeat(80));
}

// Export function for use in other scripts
export async function analyzeWalletAssets(
  userAddress: string
): Promise<WalletSummary> {
  console.log("🚀 Starting wallet assets analysis...");
  console.log(`🌐 Network: ${getNetworkName()}`);
  console.log(`⚙️  Batch Size: ${BATCH_SIZE}`);
  console.log(
    `📊 Detailed Info: ${SHOW_DETAILED_INFO ? "Enabled" : "Disabled"}`
  );

  const startTime = Date.now();

  try {
    const summary = await getWalletAssets(userAddress);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`⏱️  Analysis completed in ${elapsed} seconds`);
    displayWalletSummary(summary, userAddress);

    return summary;
  } catch (error) {
    console.error("💥 Error in analysis:", error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    await analyzeWalletAssets(USER_ADDRESS);

    console.log("🎉 Wallet analysis completed successfully!");

    // Optionally save results to file
    // await fs.writeFile('./wallet-assets.json', JSON.stringify(summary, null, 2));
  } catch (error) {
    console.error("💥 Error in main:", error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
