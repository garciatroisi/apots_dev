import { aptos, getNetworkName } from "./config/aptos-client";

// Hardcoded user address - replace with the address you want to check
const USER_ADDRESS =
  "0xd850dac2df4c1e96037d715d5bbc26f5a6b45838a1f79b504faf764f39c54bf6";

// Collection information
const COLLECTION_ADDRESS =
  "0x498034bc112bd6b050f82ed21a7b17492ecb1d3051052521ee435303c9bf3096";
const COLLECTION_NAME = "CHAN SUNG JUNG | UFC FIGHT NIGHT MAR 26, 2011";

interface UserTokenInfo {
  tokenId: string;
  tokenName: string;
  tokenUri: string | undefined;
  digitalAssetData: any | null;
  error?: string;
}

async function getUserCollectionTokens(
  userAddress: string,
  collectionAddress: string
): Promise<UserTokenInfo[]> {
  try {
    console.log(`🔍 Getting tokens for user: ${userAddress}`);
    console.log(`🏷️  Collection address: ${collectionAddress}`);

    // Get all tokens owned by the user from this specific collection with pagination
    let allUserTokens: any[] = [];
    let offset = 0;
    const limit = 100; // Maximum allowed per request
    let userTokensBatch: any[] = [];

    do {
      console.log(`📄 Fetching batch starting at offset: ${offset}`);

      userTokensBatch = await aptos.getAccountOwnedTokensFromCollectionAddress({
        accountAddress: userAddress,
        collectionAddress: collectionAddress,
        options: {
          limit: limit,
          offset: offset,
        },
      });

      allUserTokens = allUserTokens.concat(userTokensBatch);
      console.log(
        `📊 Batch size: ${userTokensBatch.length}, Total so far: ${allUserTokens.length}`
      );

      // Update offset for next batch
      offset += userTokensBatch.length;
    } while (userTokensBatch.length === limit);

    console.log(`📊 Found ${allUserTokens.length} total tokens in collection`);

    // Get detailed information for each token
    const userTokensInfo = await Promise.all(
      allUserTokens.map(async (token) => {
        try {
          // Get complete digital asset data
          const digitalAssetData = await aptos.getDigitalAssetData({
            digitalAssetAddress: token.token_data_id,
          });

          return {
            tokenId: token.token_data_id,
            tokenName: token.current_token_data?.token_name || "Unknown",
            tokenUri: token.current_token_data?.token_uri || undefined,
            digitalAssetData: {
              ...digitalAssetData,
              // Additional computed properties for easier access
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
            `Error getting data for token ${token.token_data_id}:`,
            error
          );
          return {
            tokenId: token.token_data_id,
            tokenName: token.current_token_data?.token_name || "Unknown",
            tokenUri: token.current_token_data?.token_uri || undefined,
            digitalAssetData: null,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      })
    );

    console.log("✅ User collection tokens retrieved successfully");
    return userTokensInfo;
  } catch (error) {
    console.error("❌ Error getting user collection tokens:", error);
    throw error;
  }
}

async function displaySerialNumbersOnly(tokens: UserTokenInfo[]) {
  console.log("\n" + "=".repeat(70));
  console.log("🔢 SERIAL NUMBERS LIST");
  console.log("=".repeat(70));
  console.log(`👤 User Address: ${USER_ADDRESS}`);
  console.log(`🏷️  Collection: ${COLLECTION_NAME}`);
  console.log(`📊 Total Tokens: ${tokens.length}`);

  if (tokens.length === 0) {
    console.log("\n❌ No tokens found in this collection for this user");
  } else {
    console.log("\n🎯 SERIAL NUMBERS:");
    console.log("-".repeat(50));

    const serialNumbers: string[] = [];

    for (const token of tokens) {
      if (token.digitalAssetData?.token_properties) {
        const serialNumber = token.digitalAssetData.token_properties["Serial Number"];
        if (serialNumber) {
          serialNumbers.push(serialNumber);
        }
      }
    }

    // Sort serial numbers numerically
    serialNumbers.sort((a, b) => parseInt(a) - parseInt(b));

    // Display sorted serial numbers
    serialNumbers.forEach(serialNumber => {
      console.log(`   ${serialNumber}`);
    });

    console.log("\n📋 SUMMARY:");
    console.log(`   Total Serial Numbers: ${serialNumbers.length}`);
    console.log(`   Serial Numbers (sorted): [${serialNumbers.join(", ")}]`);
  }

  console.log("=".repeat(70));
}

async function main() {
  console.log("🚀 Starting serial numbers analysis...");
  console.log(`🌐 Network: ${getNetworkName()}`);

  console.log(`🎯 Target user: ${USER_ADDRESS}`);
  console.log(`🏷️  Target collection: ${COLLECTION_NAME}`);

  try {
    const userTokens = await getUserCollectionTokens(
      USER_ADDRESS,
      COLLECTION_ADDRESS
    );

    // Display serial numbers only
    await displaySerialNumbersOnly(userTokens);

    console.log("🎉 Serial numbers analysis completed successfully!");
  } catch (error) {
    console.error("💥 Error in main:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
