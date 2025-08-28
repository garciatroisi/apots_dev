import { aptos, getNetworkName } from "../config/aptos-client";
import * as fs from 'fs';
import * as path from 'path';

// No hardcoded user address - will use the address from each CSV line

interface SerialToCheck {
  user_address: string;
  collection_name: string;
  collection_address: string;
  serial_number: number;
}

interface UserTokenInfo {
  tokenId: string;
  tokenName: string;
  tokenUri: string | undefined;
  digitalAssetData: any | null;
  error?: string;
}

interface SerialCheckResult {
  user_address: string;
  collection_name: string;
  collection_address: string;
  serial_number: number;
  has_token: boolean;
  token_id?: string;
  error?: string;
}

function parseCSV(filePath: string): SerialToCheck[] {
  try {
    const csvContent = fs.readFileSync(filePath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim() !== '');
    
    // Skip header line
    const dataLines = lines.slice(1);
    
    return dataLines.map(line => {
      // Parse CSV with proper handling of quoted fields
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      // Add the last value
      values.push(current.trim());
      
      // Remove quotes from values
      const cleanValues = values.map(val => val.replace(/^"|"$/g, ''));
      
      return {
        user_address: cleanValues[0] || '',
        collection_name: cleanValues[1] || '',
        collection_address: cleanValues[2] || '',
        serial_number: parseInt(cleanValues[3] || '0')
      };
    });
  } catch (error) {
    console.error('❌ Error reading CSV file:', error);
    throw error;
  }
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

function findSerialNumberInTokens(tokens: UserTokenInfo[], targetSerial: number): { found: boolean; tokenId?: string } {
  for (const token of tokens) {
    if (token.digitalAssetData?.token_properties) {
      const serialNumber = token.digitalAssetData.token_properties["Serial Number"];
      if (serialNumber && parseInt(serialNumber) === targetSerial) {
        return { found: true, tokenId: token.tokenId };
      }
    }
  }
  return { found: false };
}

async function checkSerialsForUser(serialsToCheck: SerialToCheck[]): Promise<SerialCheckResult[]> {
  const results: SerialCheckResult[] = [];
  
  // Group by user address and collection address to avoid duplicate API calls
  const userCollectionsMap = new Map<string, Map<string, SerialToCheck[]>>();
  
  for (const serial of serialsToCheck) {
    if (!userCollectionsMap.has(serial.user_address)) {
      userCollectionsMap.set(serial.user_address, new Map());
    }
    const userCollections = userCollectionsMap.get(serial.user_address)!;
    
    if (!userCollections.has(serial.collection_address)) {
      userCollections.set(serial.collection_address, []);
    }
    userCollections.get(serial.collection_address)!.push(serial);
  }

  console.log(`📊 Processing ${userCollectionsMap.size} unique users...`);

  for (const [userAddress, collectionsMap] of userCollectionsMap) {
    console.log(`\n👤 Processing user: ${userAddress}`);
    console.log(`📊 Processing ${collectionsMap.size} unique collections for this user...`);

    for (const [collectionAddress, serials] of collectionsMap) {
      console.log(`\n🏷️  Processing collection: ${serials[0]?.collection_name || 'Unknown'}`);
      console.log(`📍 Address: ${collectionAddress}`);
      console.log(`🔢 Checking ${serials.length} serial numbers...`);

      try {
        // Get all tokens for this collection and user
        const userTokens = await getUserCollectionTokens(userAddress, collectionAddress);
        
        // Check each serial number
        for (const serial of serials) {
          const { found, tokenId } = findSerialNumberInTokens(userTokens, serial.serial_number);
          
          results.push({
            user_address: serial.user_address,
            collection_name: serial.collection_name,
            collection_address: serial.collection_address,
            serial_number: serial.serial_number,
            has_token: found,
            ...(tokenId && { token_id: tokenId })
          });

          const status = found ? "✅ FOUND" : "❌ NOT FOUND";
          console.log(`   Serial ${serial.serial_number}: ${status}`);
        }
      } catch (error) {
        console.error(`❌ Error processing collection ${collectionAddress}:`, error);
        
        // Add error results for all serials in this collection
        for (const serial of serials) {
          results.push({
            user_address: serial.user_address,
            collection_name: serial.collection_name,
            collection_address: serial.collection_address,
            serial_number: serial.serial_number,
            has_token: false,
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }
    }
  }

  return results;
}

function displayResults(results: SerialCheckResult[]) {
  console.log("\n" + "=".repeat(100));
  console.log("🔍 SERIAL NUMBERS CHECK RESULTS");
  console.log("=".repeat(100));
  console.log(`📊 Total Items Checked: ${results.length}`);

  const foundCount = results.filter(r => r.has_token).length;
  const notFoundCount = results.filter(r => !r.has_token && !r.error).length;
  const errorCount = results.filter(r => r.error).length;

  console.log(`✅ Found: ${foundCount}`);
  console.log(`❌ Not Found: ${notFoundCount}`);
  console.log(`⚠️  Errors: ${errorCount}`);

  console.log("\n📋 DETAILED RESULTS:");
  console.log("-".repeat(100));

  // Group results by user and collection
  const resultsByUser = new Map<string, Map<string, SerialCheckResult[]>>();
  
  for (const result of results) {
    if (!resultsByUser.has(result.user_address)) {
      resultsByUser.set(result.user_address, new Map());
    }
    const userCollections = resultsByUser.get(result.user_address)!;
    
    if (!userCollections.has(result.collection_name)) {
      userCollections.set(result.collection_name, []);
    }
    userCollections.get(result.collection_name)!.push(result);
  }

  for (const [userAddress, collectionsMap] of resultsByUser) {
    console.log(`\n👤 User: ${userAddress}`);
    
    for (const [collectionName, collectionResults] of collectionsMap) {
      console.log(`\n🏷️  Collection: ${collectionName}`);
      console.log(`📍 Address: ${collectionResults[0]?.collection_address || 'Unknown'}`);
      
      const foundInCollection = collectionResults.filter(r => r.has_token);
      const notFoundInCollection = collectionResults.filter(r => !r.has_token && !r.error);
      const errorsInCollection = collectionResults.filter(r => r.error);

      console.log(`   ✅ Found: ${foundInCollection.length}`);
      console.log(`   ❌ Not Found: ${notFoundInCollection.length}`);
      console.log(`   ⚠️  Errors: ${errorsInCollection.length}`);

      if (foundInCollection.length > 0) {
        console.log(`   🎯 Found Serials: [${foundInCollection.map(r => r.serial_number).sort((a, b) => a - b).join(", ")}]`);
      }
      
      if (notFoundInCollection.length > 0) {
        console.log(`   ❌ Missing Serials: [${notFoundInCollection.map(r => r.serial_number).sort((a, b) => a - b).join(", ")}]`);
      }

      if (errorsInCollection.length > 0) {
        console.log(`   ⚠️  Error Serials: [${errorsInCollection.map(r => r.serial_number).sort((a, b) => a - b).join(", ")}]`);
      }
    }
  }

  console.log("\n" + "=".repeat(100));
  
  // Final summary
  console.log("\n🎯 FINAL SUMMARY:");
  console.log("=".repeat(50));
  console.log(`📊 Total Items Checked: ${results.length}`);
  console.log(`✅ Found: ${foundCount}`);
  console.log(`❌ Not Found: ${notFoundCount}`);
  console.log(`⚠️  Errors: ${errorCount}`);
  
  if (foundCount > 0) {
    console.log(`\n🎉 SUCCESS: User has ${foundCount} of the ${results.length} requested serial numbers!`);
  } else {
    console.log(`\n😔 RESULT: User has NONE of the ${results.length} requested serial numbers.`);
  }
  
  console.log("=".repeat(50));
}

async function main() {
  console.log("🚀 Starting serial numbers check...");
  console.log(`🌐 Network: ${getNetworkName()}`);

  // Path to the CSV file
  const csvPath = path.join(__dirname, 'serialstocheck.csv');
  
  try {
    // Check if CSV file exists
    if (!fs.existsSync(csvPath)) {
      console.error(`❌ CSV file not found at: ${csvPath}`);
      console.log("📁 Please ensure the CSV file exists in the correct location");
      process.exit(1);
    }

    console.log(`📁 Reading CSV file: ${csvPath}`);
    
    // Parse CSV file
    const serialsToCheck = parseCSV(csvPath);
    console.log(`📊 Loaded ${serialsToCheck.length} serial numbers to check`);

    // Get unique users
    const uniqueUsers = new Set(serialsToCheck.map(serial => serial.user_address));
    console.log(`👥 Found ${uniqueUsers.size} unique users in CSV`);

    // Process all serials from the CSV
    console.log(`🔢 Processing all ${serialsToCheck.length} serial numbers from CSV`);

    // Check serials
    const results = await checkSerialsForUser(serialsToCheck);

    // Display results
    displayResults(results);

    console.log("🎉 Serial numbers check completed successfully!");
  } catch (error) {
    console.error("💥 Error in main:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
