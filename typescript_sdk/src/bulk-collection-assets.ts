import { aptos, getNetworkName } from "./config/aptos-client";
import { loadCollections, CollectionInfo } from "./collections-loader";

// Configuration
const USER_ADDRESS =
  "0xf0c680055d459b5f260672e03e0482077d1f61daa664d6369b0a00b368b309f3";
const BATCH_SIZE = 50; // Number of collections to process concurrently
const TOKEN_BATCH_SIZE = 100; // Number of tokens to fetch per request
const MAX_CONCURRENT_REQUESTS = 10; // Limit concurrent API calls

// Collection file path - change this to your actual collections file
const COLLECTIONS_FILE = "./collections.json"; // or "./sample-collections.json"

interface AssetInfo {
  collectionAddress: string;
  collectionName: string;
  tokenId: string;
  tokenName: string;
  tokenUri?: string;
  digitalAssetData?: any;
  error?: string;
}

interface CollectionResult {
  collection: CollectionInfo;
  assets: AssetInfo[];
  totalAssets: number;
  error?: string;
}

// Rate limiting utility
class RateLimiter {
  private queue: (() => Promise<any>)[] = [];
  private running = 0;

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          this.running++;
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.running--;
          this.processQueue();
        }
      });
      this.processQueue();
    });
  }

  private processQueue() {
    if (this.queue.length > 0 && this.running < MAX_CONCURRENT_REQUESTS) {
      const fn = this.queue.shift();
      if (fn) fn();
    }
  }
}

const rateLimiter = new RateLimiter();

// Get all tokens for a user from a specific collection
async function getUserTokensFromCollection(
  userAddress: string,
  collection: CollectionInfo
): Promise<AssetInfo[]> {
  try {
    console.log(`🔍 Processing collection: ${collection.name}`);

    let allTokens: any[] = [];
    let offset = 0;
    let tokensBatch: any[] = [];

    // Fetch all tokens with pagination
    do {
      tokensBatch = await rateLimiter.execute(() =>
        aptos.getAccountOwnedTokensFromCollectionAddress({
          accountAddress: userAddress,
          collectionAddress: collection.address,
          options: {
            limit: TOKEN_BATCH_SIZE,
            offset: offset,
          },
        })
      );

      allTokens = allTokens.concat(tokensBatch);
      offset += tokensBatch.length;
    } while (tokensBatch.length === TOKEN_BATCH_SIZE);

    if (allTokens.length === 0) {
      console.log(`   ⚠️  No tokens found in collection: ${collection.name}`);
      return [];
    }

    console.log(
      `   📊 Found ${allTokens.length} tokens in collection: ${collection.name}`
    );

    // Get detailed information for each token with concurrency
    const assetPromises = allTokens.map(async (token) => {
      try {
        const digitalAssetData = await rateLimiter.execute(() =>
          aptos.getDigitalAssetData({
            digitalAssetAddress: token.token_data_id,
          })
        );

        return {
          collectionAddress: collection.address,
          collectionName: collection.name,
          tokenId: token.token_data_id,
          tokenName: token.current_token_data?.token_name || "Unknown",
          tokenUri: token.current_token_data?.token_uri || undefined,
          digitalAssetData: {
            tokenStandard: digitalAssetData.token_standard,
            tokenProperties: digitalAssetData.token_properties,
            supply: digitalAssetData.supply,
            maximum: digitalAssetData.maximum,
            largestPropertyVersionV1:
              digitalAssetData.largest_property_version_v1,
            tokenUri: digitalAssetData.token_uri,
            description: digitalAssetData.description,
            tokenName: digitalAssetData.token_name,
            collectionId: digitalAssetData.collection_id,
          },
        };
      } catch (error) {
        console.error(
          `   ❌ Error getting data for token ${token.token_data_id}:`,
          error
        );
        return {
          collectionAddress: collection.address,
          collectionName: collection.name,
          tokenId: token.token_data_id,
          tokenName: token.current_token_data?.token_name || "Unknown",
          tokenUri: token.current_token_data?.token_uri || undefined,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    const assets = await Promise.all(assetPromises);
    console.log(`   ✅ Completed collection: ${collection.name}`);
    return assets;
  } catch (error) {
    console.error(
      `   ❌ Error processing collection ${collection.name}:`,
      error
    );
    return [];
  }
}

// Process collections in batches
async function processCollectionsBatch(
  collections: CollectionInfo[],
  userAddress: string
): Promise<CollectionResult[]> {
  const results: CollectionResult[] = [];

  for (const collection of collections) {
    try {
      const assets = await getUserTokensFromCollection(userAddress, collection);
      results.push({
        collection,
        assets,
        totalAssets: assets.length,
      });
    } catch (error) {
      results.push({
        collection,
        assets: [],
        totalAssets: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}

// Main processing function
async function processAllCollections(
  userAddress: string,
  collections: CollectionInfo[]
): Promise<CollectionResult[]> {
  console.log(`🚀 Starting bulk collection analysis...`);
  console.log(`🌐 Network: ${getNetworkName()}`);
  console.log(`👤 User Address: ${userAddress}`);
  console.log(`📚 Total Collections: ${collections.length}`);
  console.log(`⚙️  Batch Size: ${BATCH_SIZE}`);
  console.log(`🔄 Max Concurrent Requests: ${MAX_CONCURRENT_REQUESTS}`);

  const allResults: CollectionResult[] = [];
  const startTime = Date.now();

  // Process collections in batches
  for (let i = 0; i < collections.length; i += BATCH_SIZE) {
    const batch = collections.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(collections.length / BATCH_SIZE);

    console.log(
      `\n📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} collections)`
    );

    const batchResults = await processCollectionsBatch(batch, userAddress);
    allResults.push(...batchResults);

    // Progress update
    const processed = Math.min(i + BATCH_SIZE, collections.length);
    const progress = ((processed / collections.length) * 100).toFixed(1);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(
      `📈 Progress: ${processed}/${collections.length} (${progress}%) - Elapsed: ${elapsed}s`
    );
  }

  return allResults;
}

// Display results
function displayResults(results: CollectionResult[], userAddress: string) {
  console.log("\n" + "=".repeat(80));
  console.log("📊 BULK COLLECTION ANALYSIS RESULTS");
  console.log("=".repeat(80));
  console.log(`👤 User Address: ${userAddress}`);
  console.log(`📚 Collections Processed: ${results.length}`);

  const totalAssets = results.reduce(
    (sum, result) => sum + result.totalAssets,
    0
  );
  const collectionsWithAssets = results.filter((r) => r.totalAssets > 0).length;
  const collectionsWithErrors = results.filter((r) => r.error).length;

  console.log(`🎯 Total Assets Found: ${totalAssets}`);
  console.log(`✅ Collections with Assets: ${collectionsWithAssets}`);
  console.log(`❌ Collections with Errors: ${collectionsWithErrors}`);

  // Summary by collection
  console.log("\n📋 COLLECTION SUMMARY:");
  console.log("-".repeat(60));

  results.forEach((result, index) => {
    const status = result.error ? "❌" : result.totalAssets > 0 ? "✅" : "⚠️";
    console.log(`${index + 1}. ${status} ${result.collection.name}`);
    console.log(`   Address: ${result.collection.address}`);
    console.log(`   Assets: ${result.totalAssets}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    console.log("");
  });

  // Detailed asset information
  if (totalAssets > 0) {
    console.log("\n🎯 ASSET DETAILS:");
    console.log("-".repeat(60));

    results.forEach((result) => {
      if (result.assets.length > 0) {
        console.log(`\n🏷️  Collection: ${result.collection.name}`);
        console.log(`📍 Address: ${result.collection.address}`);
        console.log(`📊 Assets: ${result.totalAssets}`);

        result.assets.forEach((asset, assetIndex) => {
          console.log(`\n   ${assetIndex + 1}. ${asset.tokenName}`);
          console.log(`      Token ID: ${asset.tokenId}`);
          if (asset.tokenUri) {
            console.log(`      URI: ${asset.tokenUri}`);
          }
          if (asset.digitalAssetData) {
            console.log(
              `      Standard: ${asset.digitalAssetData.tokenStandard}`
            );
            console.log(`      Supply: ${asset.digitalAssetData.supply}`);
            if (asset.digitalAssetData.tokenProperties) {
              const propCount = Object.keys(
                asset.digitalAssetData.tokenProperties
              ).length;
              console.log(`      Properties: ${propCount} properties`);
            }
          }
          if (asset.error) {
            console.log(`      ❌ Error: ${asset.error}`);
          }
        });
      }
    });
  }

  console.log("=".repeat(80));
}

// Export function for use in other scripts
export async function analyzeUserCollections(
  userAddress: string,
  collections: CollectionInfo[]
): Promise<CollectionResult[]> {
  const results = await processAllCollections(userAddress, collections);
  displayResults(results, userAddress);
  return results;
}

// Main execution
async function main() {
  try {
    // Load collections from file or use sample data
    const collections = await loadCollections(COLLECTIONS_FILE, 10);

    const results = await analyzeUserCollections(USER_ADDRESS, collections);

    console.log("🎉 Bulk analysis completed successfully!");

    // Optionally save results to file
    // await fs.writeFile('./analysis-results.json', JSON.stringify(results, null, 2));
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
