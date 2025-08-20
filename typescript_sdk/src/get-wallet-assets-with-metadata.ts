import { aptos, getNetworkName } from "./config/aptos-client";
import * as fs from "fs/promises";
import * as path from "path";

// Configuration
// const USER_ADDRESS =
//   "0x73631f8f723c7781e500c255707a4354d5ecbd09ac6335fd2cc0d1b4f8d36792";
const USER_ADDRESS =
  "0xf0c680055d459b5f260672e03e0482077d1f61daa664d6369b0a00b368b309f3";
const BATCH_SIZE = 100; // Number of tokens to fetch per request
const SHOW_DETAILED_INFO = true; // Set to false for faster execution with basic info only
const CSV_FILE_PATH = "./src/GalleryMetadatas.csv";

interface MetadataRow {
  collection_id: string;
  name: string;
  description: string;
  event: string;
  tier: string;
  series: string;
  winMethod: string;
  weightClass: string;
  athleteName: string;
  opponentName: string;
  editionSize: string;
  newMetadataIpfsHash: string;
  video: string;
  assetPreviewUri: string;
  additionalImages: string;
}

interface WalletAsset {
  tokenId: string;
  tokenName: string;
  collectionAddress: string;
  tokenUri?: string;
  digitalAssetData?: any;
  error?: string;
  metadata?: MetadataRow; // Added metadata field
}

interface WalletSummary {
  totalAssets: number;
  assets: WalletAsset[];
}

// Parse CSV and create hashmap
async function parseCSVAndCreateHashmap(): Promise<Map<string, MetadataRow>> {
  try {
    console.log("📖 Reading CSV file...");
    const csvContent = await fs.readFile(CSV_FILE_PATH, "utf8");
    const lines = csvContent.split("\n");

    // Skip header
    const dataLines = lines.slice(1);
    const metadataMap = new Map<string, MetadataRow>();

    console.log(`📊 Processing ${dataLines.length} metadata entries...`);

    for (const line of dataLines) {
      if (line.trim() === "") continue;

      // Parse CSV line (handle commas within quotes)
      const columns = parseCSVLine(line);

      if (columns.length >= 15) {
        const metadata: MetadataRow = {
          collection_id: columns[0]?.replace(/"/g, "") || "",
          name: columns[1]?.replace(/"/g, "") || "",
          description: columns[2]?.replace(/"/g, "") || "",
          event: columns[3]?.replace(/"/g, "") || "",
          tier: columns[4]?.replace(/"/g, "") || "",
          series: columns[5]?.replace(/"/g, "") || "",
          winMethod: columns[6]?.replace(/"/g, "") || "",
          weightClass: columns[7]?.replace(/"/g, "") || "",
          athleteName: columns[8]?.replace(/"/g, "") || "",
          opponentName: columns[9]?.replace(/"/g, "") || "",
          editionSize: columns[10]?.replace(/"/g, "") || "",
          newMetadataIpfsHash: columns[11]?.replace(/"/g, "") || "",
          video: columns[12]?.replace(/"/g, "") || "",
          assetPreviewUri: columns[13]?.replace(/"/g, "") || "",
          additionalImages: columns[14]?.replace(/"/g, "") || "",
        };

        // Store with both the full IPFS URI and just the hash as keys
        const hashOnly = extractHashFromUri(metadata.newMetadataIpfsHash);
        if (hashOnly) {
          metadataMap.set(hashOnly, metadata);
        }
      }
    }

    console.log(`✅ Created hashmap with ${metadataMap.size} metadata entries`);
    return metadataMap;
  } catch (error) {
    console.error("❌ Error parsing CSV:", error);
    throw error;
  }
}

// Parse CSV line handling quotes
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

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

    return {
      totalAssets: processedAssets.length,
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
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });

  const processedAssets = await Promise.all(assetPromises);
  console.log("✅ Assets processing completed");
  return processedAssets;
}

// Extract hash from IPFS URI
function extractHashFromUri(uri: string): string | null {
  if (!uri) return null;
  // Remove https://ufcstrike.mypinata.cloud/ipfs/ prefix
  if (uri.startsWith("https://ufcstrike.mypinata.cloud/ipfs/")) {
    return uri.replace("https://ufcstrike.mypinata.cloud/ipfs/", "");
  }

  // Remove ipfs:// prefix
  if (uri.startsWith("ipfs://")) {
    return uri.replace("ipfs://", "");
  }

  // Remove https://ipfs.io/ipfs/ prefix
  if (uri.startsWith("https://ipfs.io/ipfs/")) {
    return uri.replace("https://ipfs.io/ipfs/", "");
  }

  return null;
}

function matchAssetsWithMetadata(
  assets: WalletAsset[],
  metadataMap: Map<string, MetadataRow>
): any[] {
  console.log("🔗 Matching assets with metadata...");

  let matchedCount = 0;
  let unmatchedCount = 0;

  const assetsWithMetadata = assets.map((asset) => {
    // Try to match by token URI hash
    if (asset.tokenUri) {
      const tokenHash = extractHashFromUri(asset.tokenUri);
      if (tokenHash && metadataMap.has(tokenHash)) {
        const props = asset.digitalAssetData?.tokenProperties;
        const metadata = metadataMap.get(tokenHash)!;
        const newAsset = {
          ...metadata,
          ...props,
          _matched: true, // Flag to identify matched assets
        };
        matchedCount++;
        return newAsset;
      }
    }

    // Asset didn't match - return with flag
    unmatchedCount++;
    return {
      ...asset,
      _matched: false, // Flag to identify unmatched assets
    };
  });

  console.log(
    `✅ Matched ${matchedCount} assets with metadata out of ${assets.length} total assets`
  );
  console.log(`⚠️  Unmatched assets: ${unmatchedCount}`);

  return assetsWithMetadata;
}

// Export function for use in other scripts
export async function analyzeWalletAssetsWithMetadata(
  userAddress: string
): Promise<WalletSummary> {
  console.log("🚀 Starting wallet assets analysis with metadata...");
  console.log(`🌐 Network: ${getNetworkName()}`);
  console.log(`⚙️  Batch Size: ${BATCH_SIZE}`);
  console.log(
    `📊 Detailed Info: ${SHOW_DETAILED_INFO ? "Enabled" : "Disabled"}`
  );

  const startTime = Date.now();

  try {
    // Parse CSV and create metadata hashmap
    const metadataMap = await parseCSVAndCreateHashmap();

    // Get wallet assets
    const summary = await getWalletAssets(userAddress);

    // Match assets with metadata
    const assetsWithMetadata = matchAssetsWithMetadata(
      summary.assets,
      metadataMap
    );

    const finalSummary: WalletSummary = {
      ...summary,
      assets: assetsWithMetadata,
    };

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`⏱️  Analysis completed in ${elapsed} seconds`);

    return finalSummary;
  } catch (error) {
    console.error("💥 Error in analysis:", error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    const summary = await analyzeWalletAssetsWithMetadata(USER_ADDRESS);

    console.log("🎉 Wallet analysis with metadata completed successfully!");

    // Save results to JSON file
    const outputPath = `./wallet-assets-with-metadata-${Date.now()}.json`;
    await fs.writeFile(outputPath, JSON.stringify(summary, null, 2));
    console.log(`💾 Results saved to: ${outputPath}`);

    // Display summary
    console.log("\n" + "=".repeat(80));
    console.log("📊 SUMMARY");
    console.log("=".repeat(80));
    console.log(`👤 Wallet Address: ${USER_ADDRESS}`);
    console.log(`📊 Total Assets: ${summary.totalAssets}`);

    const assetsWithMetadata = summary.assets.filter(
      (asset: any) => asset._matched === true
    );
    const assetsWithoutMetadata = summary.assets.filter(
      (asset: any) => asset._matched === false
    );

    console.log(`🔗 Assets with Metadata: ${assetsWithMetadata.length}`);
    console.log(`⚠️  Assets without Metadata: ${assetsWithoutMetadata.length}`);

    // Show matched assets
    if (assetsWithMetadata.length > 0) {
      console.log("\n🎯 ASSETS WITH METADATA:");
      console.log("-".repeat(60));

      assetsWithMetadata.slice(0, 5).forEach((asset: any, index) => {
        console.log(`\n${index + 1}. ${asset.name || asset.tokenName}`);
        console.log(`   Serial Number: ${asset["Serial Number"] || "Unknown"}`);
        console.log(`   Event: ${asset.event || "Unknown"}`);
        console.log(`   Tier: ${asset.tier || "Unknown"}`);
        console.log(`   Series: ${asset.series || "Unknown"}`);
        console.log(`   Win Method: ${asset.winMethod || "Unknown"}`);
        console.log(`   Weight Class: ${asset.weightClass || "Unknown"}`);
        console.log(`   Athlete: ${asset.athleteName || "Unknown"}`);
        console.log(`   Opponent: ${asset.opponentName || "Unknown"}`);
        console.log(`   Edition Size: ${asset.editionSize || "Unknown"}`);
      });
    }

    // Show unmatched assets
    if (assetsWithoutMetadata.length > 0) {
      console.log("\n❌ ASSETS WITHOUT METADATA:");
      console.log("-".repeat(60));

      assetsWithoutMetadata.slice(0, 3).forEach((asset: any, index) => {
        console.log(`\n${index + 1}. ${asset.tokenName}`);
        console.log(`   Token ID: ${asset.tokenId}`);
        console.log(`   Collection: ${asset.collectionAddress}`);
        console.log(`   Token URI: ${asset.tokenUri || "N/A"}`);
        if (asset.digitalAssetData?.tokenUri) {
          console.log(`   Digital URI: ${asset.digitalAssetData.tokenUri}`);
        }
      });
    }
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
