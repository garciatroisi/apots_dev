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

    // Get detailed info about burned tokens
    const burnAddressTokensInfo = burnAddressTokens.map((token) => ({
      tokenId: token.token_data_id,
      tokenName: token.current_token_data?.token_name || "Unknown",
      tokenUri: token.current_token_data?.token_uri || undefined,
    }));

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
      // query MyQuery {
      //   token_activities_v2(
      //     where: {
      //       _and: [
      //         { to_address: { _eq: "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff" } },
      //         { token_data_id: { _eq: "0x0fd9794fd23516cebe3800b98c8c4e58b68892d8c8ed10cd2b57329bff3adada" } }
      //       ]
      //     }
      //   ) {
      //     to_address
      //     from_address
      //     transaction_version
      //   }
      // }
      const r = await aptos.getDigitalAssetActivity({
        digitalAssetAddress: token.tokenId,
      });

      // Filter burn events
      const burnEvents = r.filter(
        (event) =>
          event.to_address ===
          "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
      );

      burnEvents.forEach((event, _) => {
        console.log(`  Burned by: ${event.from_address}`);
        console.log(`  Timestamp: ${event.transaction_timestamp}`);
        console.log(`  Transaction Version: ${event.transaction_version}`);
      });
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
