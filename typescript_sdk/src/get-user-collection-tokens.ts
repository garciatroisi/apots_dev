import { aptos, getNetworkName } from "./config/aptos-client";

// Hardcoded user address - replace with the address you want to check
const USER_ADDRESS =
  "0xf0c680055d459b5f260672e03e0482077d1f61daa664d6369b0a00b368b309f3";

// Collection information
const COLLECTION_ADDRESS =
  "0x0c0736c88587d39cc4901fb3813a094d2f6b010d8b791c868055e10eeb025eee";
const COLLECTION_NAME = "MINGYANG ZHANG | UFC FIGHT NIGHT NOV 23, 2024";

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

async function displayUserCollectionTokens(
  userAddress: string,
  collectionName: string,
  tokens: UserTokenInfo[]
) {
  console.log("\n" + "=".repeat(70));
  console.log("👤 USER COLLECTION TOKENS REPORT");
  console.log("=".repeat(70));
  console.log(`👤 User Address: ${userAddress}`);
  console.log(`🏷️  Collection: ${collectionName}`);
  console.log(`📊 Total Tokens: ${tokens.length}`);

  if (tokens.length === 0) {
    console.log("\n❌ No tokens found in this collection for this user");
  } else {
    console.log("\n🎯 TOKENS DETAILS:");
    console.log("-".repeat(50));

    for (const [index, token] of tokens.entries()) {
      console.log(`\n${index + 1}. ${token.tokenName} (${token.tokenId})`);

      if (token.tokenUri) {
        console.log(`   URI: ${token.tokenUri}`);
      }

      // Display complete digital asset data
      if (token.digitalAssetData) {
        console.log(`   📊 TOKEN DATA:`);

        // Display token properties if available
        if (
          token.digitalAssetData.token_properties &&
          Object.keys(token.digitalAssetData.token_properties).length > 0
        ) {
          console.log(`   Token Properties:`);
          Object.entries(token.digitalAssetData.token_properties).forEach(
            ([key, value]) => {
              console.log(`     ${key}: ${JSON.stringify(value)}`);
            }
          );
        }

        // Display all available properties
        // console.log(`   🔍 ALL AVAILABLE PROPERTIES:`);
        // Object.entries(token.digitalAssetData).forEach(([key, value]) => {
        //   if (
        //     value !== null &&
        //     value !== undefined &&
        //     key !== "token_properties"
        //   ) {
        //     console.log(`   ${key}: ${JSON.stringify(value)}`);
        //   }
        // });
      } else if (token.error) {
        console.log(`   ❌ Error getting token data: ${token.error}`);
      }

      // Get activity data for this token
      //   try {
      //     const activity = await aptos.getDigitalAssetActivity({
      //       digitalAssetAddress: token.tokenId,
      //     });

      //     if (activity.length > 0) {
      //       console.log(`   📈 RECENT ACTIVITY (last 5 events):`);
      //       const recentActivity = activity.slice(0, 5);
      //       recentActivity.forEach((event, eventIndex) => {
      //         console.log(
      //           `     ${eventIndex + 1}. ${event.type} - From: ${
      //             event.from_address
      //           } To: ${event.to_address}`
      //         );
      //         console.log(`        Timestamp: ${event.transaction_timestamp}`);
      //         console.log(`        Transaction: ${event.transaction_version}`);
      //       });
      //     }
      //   } catch (error) {
      //     console.log(`   ❌ Error getting activity data: ${error}`);
      //   }

      console.log(""); // Empty line for separation
    }
  }

  console.log("=".repeat(70));
}

async function main() {
  console.log("🚀 Starting user collection tokens analysis...");
  console.log(`🌐 Network: ${getNetworkName()}`);

  console.log(`🎯 Target user: ${USER_ADDRESS}`);
  console.log(`🏷️  Target collection: ${COLLECTION_NAME}`);

  try {
    const userTokens = await getUserCollectionTokens(
      USER_ADDRESS,
      COLLECTION_ADDRESS
    );

    await displayUserCollectionTokens(
      USER_ADDRESS,
      COLLECTION_NAME,
      userTokens
    );

    console.log("🎉 Analysis completed successfully!");
  } catch (error) {
    console.error("💥 Error in main:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
