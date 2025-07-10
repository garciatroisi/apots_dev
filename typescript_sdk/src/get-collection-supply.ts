import { aptos, getNetworkName } from "./config/aptos-client";

// Burn address constant
const BURN_ADDRESS =
  "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

interface CollectionSupplyInfo {
  collectionAddress: string;
  collectionName: string;
  totalSupply: number;
  burnedTokens: number;
  circulatingSupply: number;
  burnAddressTokens: Array<{
    tokenId: string;
    tokenName: string;
    tokenUri: string | undefined;
    digitalAssetData: any | null;
    error?: string;
  }>;
}

async function getCollectionSupply(
  creatorAddress: string,
  collectionName: string
): Promise<CollectionSupplyInfo> {
  try {
    // Get collection data
    const collectionData = await aptos.getCollectionData({
      creatorAddress,
      collectionName,
    });

    // Get total supply from collection (use total_minted_v2 if available)
    const totalSupply = parseInt(
      collectionData.total_minted_v2?.toString() || "0"
    );
    console.log(`📈 Total supply: ${totalSupply}`);

    // Get tokens owned by burn address
    console.log(`🔥 Getting tokens owned by burn address: ${BURN_ADDRESS}`);
    const burnAddressTokens =
      await aptos.getAccountOwnedTokensFromCollectionAddress({
        accountAddress: BURN_ADDRESS,
        collectionAddress: collectionData.collection_id,
      });

    console.log(
      `🔥 Tokens burned in this collection: ${burnAddressTokens.length}`
    );

    // Calculate circulating supply
    const burnedTokens = burnAddressTokens.length;
    const circulatingSupply = totalSupply - burnedTokens;
    // console.log({ burnAddressTokens });
    // Get detailed info about burned tokens with complete data
    const burnAddressTokensInfo = await Promise.all(
      burnAddressTokens.map(async (token) => {
        try {
          // Get complete digital asset data
          const digitalAssetData = await aptos.getDigitalAssetData({
            digitalAssetAddress: token.token_data_id,
          });

          return {
            tokenId: token.token_data_id,
            tokenName: token.current_token_data?.token_name || "Unknown",
            tokenUri: token.current_token_data?.token_uri || undefined,
            // Complete digital asset data - include all available properties
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

    const result: CollectionSupplyInfo = {
      collectionAddress: collectionData.collection_id,
      collectionName: collectionData.collection_name,
      totalSupply,
      burnedTokens,
      circulatingSupply,
      burnAddressTokens: burnAddressTokensInfo,
    };

    console.log("✅ Collection supply calculation completed");
    return result;
  } catch (error) {
    console.error("❌ Error getting collection supply:", error);
    throw error;
  }
}

async function displayCollectionSupplyInfo(info: CollectionSupplyInfo) {
  console.log("\n" + "=".repeat(60));
  console.log("📊 COLLECTION SUPPLY REPORT");
  console.log("=".repeat(60));
  console.log(`🏷️  Collection: ${info.collectionName}`);
  console.log(`📍 Address: ${info.collectionAddress}`);
  console.log(`📈 Total Supply: ${info.totalSupply.toLocaleString()}`);
  console.log(`🔥 Burned Tokens: ${info.burnedTokens.toLocaleString()}`);
  console.log(
    `💎 Circulating Supply: ${info.circulatingSupply.toLocaleString()}`
  );
  console.log(
    `📊 Burn Percentage: ${(
      (info.burnedTokens / info.totalSupply) *
      100
    ).toFixed(2)}%`
  );
  //
  if (info.burnAddressTokens.length > 0) {
    console.log("\n🔥 BURNED TOKENS DETAILS:");
    console.log("-".repeat(40));
    for (const [index, token] of info.burnAddressTokens.entries()) {
      console.log(`${index + 1}. ${token.tokenName} (${token.tokenId})`);
      if (token.tokenUri) {
        console.log(`   URI: ${token.tokenUri}`);
      }

      // Display complete digital asset data
      if (token.digitalAssetData) {
        console.log(`   📊 COMPLETE TOKEN DATA:`);
        console.log(
          `   Token Standard: ${token.digitalAssetData.token_standard}`
        );
        console.log(`   Supply: ${token.digitalAssetData.supply}`);
        console.log(`   Maximum: ${token.digitalAssetData.maximum}`);
        console.log(`   Description: ${token.digitalAssetData.description}`);
        console.log(
          `   Collection ID: ${token.digitalAssetData.collection_id}`
        );
        console.log(
          `   Token Properties:`,
          token.digitalAssetData.token_properties
        );

        // Display all available properties
        console.log(`   🔍 ALL AVAILABLE PROPERTIES:`);
        Object.entries(token.digitalAssetData).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            console.log(`   ${key}: ${JSON.stringify(value)}`);
          }
        });
      } else if (token.error) {
        console.log(`   ❌ Error getting token data: ${token.error}`);
      }

      // Get activity data
      try {
        const r = await aptos.getDigitalAssetActivity({
          digitalAssetAddress: token.tokenId,
        });

        // Filter burn events
        const burnEvents = r.filter(
          (event) =>
            event.to_address ===
            "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
        );

        if (burnEvents.length > 0) {
          console.log(`   🔥 BURN ACTIVITY:`);
          burnEvents.forEach((event, _) => {
            console.log(`     Burned by: ${event.from_address}`);
            console.log(`     Timestamp: ${event.transaction_timestamp}`);
            console.log(
              `     Transaction Version: ${event.transaction_version}`
            );
          });
        }
      } catch (error) {
        console.log(`   ❌ Error getting activity data: ${error}`);
      }

      console.log(""); // Empty line for separation
    }
  }

  console.log("=".repeat(60));
}

async function main() {
  console.log("🚀 Starting collection supply analysis...");
  console.log(`🌐 Network: ${getNetworkName()}`);

  // Replace with the collection address you want to analyze
  const collectionAddress =
    "0xd49449ebf80e6c4e9fe9753cfc52078a70c699a9c79135388636f1cbdc56b930";
  const collectionName = "UFCPACKS_V1";

  console.log(`🎯 Target collection: ${collectionAddress}`);

  try {
    const supplyInfo = await getCollectionSupply(
      collectionAddress,
      collectionName
    );
    await displayCollectionSupplyInfo(supplyInfo);

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
