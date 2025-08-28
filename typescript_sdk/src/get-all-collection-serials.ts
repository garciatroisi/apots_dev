import { aptos, getNetworkName } from "./config/aptos-client";

// Collection information - change these to the collection you want to check
const COLLECTION_ADDRESS =
  "0x37bb7bd9d9d10a2d5bc4856fefc0ac611105b8d83772f0d95e9014ff3b5ebbe9";
const COLLECTION_NAME = "TALLISON TEIXEIRA | UFC 312";

interface TokenInfo {
  tokenId: string;
  tokenName: string;
  serialNumber: string;
  ownerAddress: string;
  tokenUri: string | undefined;
}

interface GraphQLToken {
  token_properties: {
    "Serial Number"?: string;
    [key: string]: any;
  };
  token_data_id: string;
}

async function getAllTokensFromGraphQL(collectionAddress: string): Promise<TokenInfo[]> {
  console.log(`🔍 Fetching all tokens from GraphQL API for collection: ${collectionAddress}`);
  
  const tokens: TokenInfo[] = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    try {
      console.log(`📄 Fetching batch starting at offset: ${offset}`);
      
      // GraphQL query to get all tokens from the collection
      const query = `
        query CollectionTokens($offset: Int!, $limit: Int!) {
          current_token_datas_v2(
            where: {collection_id: {_eq: "${collectionAddress}"}}
            order_by: {token_data_id: asc}
            limit: $limit
            offset: $offset
          ) {
            token_properties
            token_data_id
          }
        }
      `;

      const response = await fetch('https://api.mainnet.aptoslabs.com/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          variables: {
            offset: offset,
            limit: limit
          }
        }),
      });

      if (!response.ok) {
        console.error(`❌ GraphQL request failed with status: ${response.status}`);
        break;
      }

      const data = await response.json() as any;
      
      if (data.errors) {
        console.error("❌ GraphQL errors:", data.errors);
        break;
      }

      const collectionTokens = data.data?.current_token_datas_v2 || [];
      console.log(`📊 Found ${collectionTokens.length} tokens in this batch`);

      if (collectionTokens.length === 0) {
        hasMore = false;
        break;
      }

      // Process each token
      for (const token of collectionTokens) {
        const serialNumber = token.token_properties?.["Serial Number"] || "Unknown";
        
        tokens.push({
          tokenId: token.token_data_id,
          tokenName: "UFC Token", // Default name since GraphQL doesn't provide it
          serialNumber: serialNumber,
          ownerAddress: "Unknown", // GraphQL doesn't provide owner info
          tokenUri: undefined,
        });
      }

      offset += collectionTokens.length;
      
      // If we got fewer tokens than the limit, we're done
      if (collectionTokens.length < limit) {
        hasMore = false;
      }

      // Limit to avoid too many requests
      if (offset > 10000) {
        console.log("⚠️  Reached limit of 10,000 tokens");
        hasMore = false;
      }

    } catch (error) {
      console.error(`❌ Error fetching batch at offset ${offset}:`, error);
      hasMore = false;
    }
  }

  console.log(`📊 Found ${tokens.length} total tokens from GraphQL API`);
  return tokens;
}

async function getAllTokensFromCollection(collectionAddress: string): Promise<TokenInfo[]> {
  console.log(`🔍 Attempting to get ALL tokens from collection: ${collectionAddress}`);
  console.log(`🏷️  Collection: ${COLLECTION_NAME}`);
  
  // Try GraphQL API approach
  const tokens = await getAllTokensFromGraphQL(collectionAddress);
  
  if (tokens.length === 0) {
    console.log("❌ No tokens found via GraphQL API. Trying alternative approach...");
    
    // Alternative: Try to get collection data first
    try {
      const collectionData = await aptos.getCollectionData({
        creatorAddress: collectionAddress,
        collectionName: COLLECTION_NAME,
      });
      
      console.log("📊 Collection data:", collectionData);
      
      if (collectionData) {
        console.log(`📈 Collection data:`, collectionData);
        console.log(`📊 Description: ${collectionData.description}`);
      }
    } catch (error) {
      console.error("❌ Could not get collection data:", error);
    }
    
    return [];
  }
  
  return tokens;
}

function displayAllSerialNumbers(tokens: TokenInfo[]) {
  console.log("\n" + "=".repeat(100));
  console.log("🔢 ALL COLLECTION SERIAL NUMBERS");
  console.log("=".repeat(100));
  console.log(`🏷️  Collection: ${COLLECTION_NAME}`);
  console.log(`📍 Address: ${COLLECTION_ADDRESS}`);
  console.log(`📊 Total Tokens: ${tokens.length}`);

  if (tokens.length === 0) {
    console.log("\n❌ No tokens found through GraphQL API");
    console.log("💡 Alternative approaches:");
    console.log("   - Check if the collection address is correct");
    console.log("   - Try a different collection address");
    console.log("   - Use a different API endpoint");
  } else {
    // Extract and sort serial numbers
    const serialNumbers: string[] = [];
    const tokensWithSerials: TokenInfo[] = [];
    const tokensWithoutSerials: TokenInfo[] = [];

    for (const token of tokens) {
      if (token.serialNumber !== "Unknown" && token.serialNumber !== "Error") {
        serialNumbers.push(token.serialNumber);
        tokensWithSerials.push(token);
      } else {
        tokensWithoutSerials.push(token);
      }
    }

    // Sort serial numbers numerically
    serialNumbers.sort((a, b) => parseInt(a) - parseInt(b));

    console.log(`\n🎯 SERIAL NUMBERS FOUND: ${serialNumbers.length}`);
    console.log(`⚠️  TOKENS WITHOUT SERIAL NUMBERS: ${tokensWithoutSerials.length}`);

    if (serialNumbers.length > 0) {
      console.log("\n📋 ALL SERIAL NUMBERS (sorted):");
      console.log("-".repeat(50));
      
      serialNumbers.forEach((serialNumber, index) => {
        console.log(`   ${index + 1}. ${serialNumber}`);
      });

      console.log("\n📊 SUMMARY:");
      console.log(`   Total Serial Numbers: ${serialNumbers.length}`);
      console.log(`   Serial Numbers: [${serialNumbers.join(", ")}]`);
      
      // Show range
      if (serialNumbers.length > 0) {
        const minSerial = parseInt(serialNumbers[0] || "0");
        const maxSerial = parseInt(serialNumbers[serialNumbers.length - 1] || "0");
        console.log(`   Range: ${minSerial} - ${maxSerial}`);
      }
    }

    // Show sample tokens
    if (tokensWithSerials.length > 0) {
      console.log("\n🎯 SAMPLE TOKENS (first 10):");
      console.log("-".repeat(50));
      const sampleTokens = tokensWithSerials.slice(0, 10);
      sampleTokens.forEach((token, index) => {
        console.log(`   ${index + 1}. Serial ${token.serialNumber} - Token ID: ${token.tokenId}`);
      });
      
      if (tokensWithSerials.length > 10) {
        console.log(`   ... and ${tokensWithSerials.length - 10} more tokens`);
      }
    }
  }

  console.log("\n" + "=".repeat(100));
}

async function main() {
  console.log("🚀 Starting ALL collection serial numbers analysis...");
  console.log(`🌐 Network: ${getNetworkName()}`);

  console.log(`🎯 Target collection: ${COLLECTION_NAME}`);
  console.log(`📍 Collection address: ${COLLECTION_ADDRESS}`);

  try {
    const allTokens = await getAllTokensFromCollection(COLLECTION_ADDRESS);

    displayAllSerialNumbers(allTokens);

    console.log("🎉 Collection analysis completed!");
  } catch (error) {
    console.error("💥 Error in main:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
