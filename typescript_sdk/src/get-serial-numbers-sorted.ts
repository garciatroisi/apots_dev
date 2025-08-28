import { aptos, getNetworkName } from "./config/aptos-client";

// Collection information - change these to the collection you want to check
const COLLECTION_ADDRESS =
  "0x498034bc112bd6b050f82ed21a7b17492ecb1d3051052521ee435303c9bf3096";
const COLLECTION_NAME = "CHAN SUNG JUNG | UFC FIGHT NIGHT MAR 26, 2011";
const USER_ADDRESS = "0xd850dac2df4c1e96037d715d5bbc26f5a6b45838a1f79b504faf764f39c54bf6";

async function getSerialNumbersSorted() {
  try {
    console.log(`🔍 Getting serial numbers for: ${COLLECTION_NAME}`);
    console.log(`👤 User: ${USER_ADDRESS}`);

    // Get all tokens owned by the user from this specific collection
    let allTokens: any[] = [];
    let offset = 0;
    const limit = 100;
    let tokensBatch: any[] = [];

    do {
      tokensBatch = await aptos.getAccountOwnedTokensFromCollectionAddress({
        accountAddress: USER_ADDRESS,
        collectionAddress: COLLECTION_ADDRESS,
        options: {
          limit: limit,
          offset: offset,
        },
      });

      allTokens = allTokens.concat(tokensBatch);
      offset += tokensBatch.length;
    } while (tokensBatch.length === limit);

    console.log(`📊 Found ${allTokens.length} tokens`);

    // Extract serial numbers
    const serialNumbers: number[] = [];

    for (const token of allTokens) {
      try {
        const digitalAssetData = await aptos.getDigitalAssetData({
          digitalAssetAddress: token.token_data_id,
        });

        if (digitalAssetData.token_properties && digitalAssetData.token_properties["Serial Number"]) {
          const serialNumber = parseInt(digitalAssetData.token_properties["Serial Number"]);
          if (!isNaN(serialNumber)) {
            serialNumbers.push(serialNumber);
          }
        }
      } catch (error) {
        console.error(`Error getting data for token ${token.token_data_id}:`, error);
      }
    }

    // Sort serial numbers
    serialNumbers.sort((a, b) => a - b);

    // Display results
    console.log("\n" + "=".repeat(60));
    console.log("🔢 SERIAL NUMBERS - SORTED LIST");
    console.log("=".repeat(60));
    console.log(`🏷️  Collection: ${COLLECTION_NAME}`);
    console.log(`👤 User: ${USER_ADDRESS}`);
    console.log(`📊 Total: ${serialNumbers.length} serial numbers`);
    console.log("");

    if (serialNumbers.length === 0) {
      console.log("❌ No serial numbers found");
    } else {
      console.log("📋 SORTED SERIAL NUMBERS:");
      console.log("-".repeat(40));
      
      serialNumbers.forEach((serial, index) => {
        console.log(`${(index + 1).toString().padStart(3, ' ')}. ${serial}`);
      });

      console.log("");
      console.log("📊 SUMMARY:");
      console.log(`   Total: ${serialNumbers.length}`);
      console.log(`   Range: ${serialNumbers[0]} - ${serialNumbers[serialNumbers.length - 1]}`);
      console.log(`   List: [${serialNumbers.join(", ")}]`);
    }

    console.log("=".repeat(60));

  } catch (error) {
    console.error("❌ Error:", error);
  }
}

async function main() {
  console.log("🚀 Getting sorted serial numbers...");
  console.log(`🌐 Network: ${getNetworkName()}`);
  
  await getSerialNumbersSorted();
  
  console.log("🎉 Done!");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
