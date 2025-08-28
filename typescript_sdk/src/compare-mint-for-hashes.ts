import { aptos, getNetworkName } from "./config/aptos-client";
import * as fs from "fs";
import * as path from "path";

console.log("Network:", getNetworkName());

// Specific account address to always use
const TARGET_ACCOUNT =
  "0x80f686c7bba12a0fce839ff160cb69774715497288996b861528727ccd256cdb";

// Directory containing mint_for transaction files
const MINT_FOR_DIR = "creator_transacrtions";

async function getAllAccountTransactions(
  pageSize: number = 100
): Promise<any[]> {
  const allTransactions: any[] = [];
  let offset = 0;
  let hasMore = true;
  let pageCount = 0;

  console.log(`Fetching all transactions for account: ${TARGET_ACCOUNT}`);
  console.log(`Page size: ${pageSize}`);

  try {
    while (hasMore) {
      pageCount++;
      console.log(`📄 Fetching page ${pageCount} with offset: ${offset}`);

      const response = await aptos.getAccountTransactions({
        accountAddress: TARGET_ACCOUNT,
        options: {
          limit: pageSize,
          offset: offset,
        },
      });

      console.log(`📥 Retrieved ${response.length} transactions`);

      if (response.length === 0) {
        hasMore = false;
        console.log("🏁 No more transactions to fetch");
        break;
      }

      // Add transactions to our collection
      allTransactions.push(...response);

      // Check if we got a full page (meaning there might be more)
      if (response.length < pageSize) {
        hasMore = false;
        console.log("🏁 Reached the end of transactions");
      } else {
        // Move to next page
        offset += pageSize;
        console.log(`⏭️  Next page will start with offset: ${offset}`);
      }

      // Add a small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(`Total transactions retrieved: ${allTransactions.length}`);
    return allTransactions;
  } catch (error) {
    console.error("Error fetching transactions:", error);
    throw error;
  }
}

function loadMintForTransactions(): Set<string> {
  console.log(
    `📁 Loading mint_for transactions from directory: ${MINT_FOR_DIR}`
  );

  const mintForHashes = new Set<string>();

  try {
    // Check if directory exists
    if (!fs.existsSync(MINT_FOR_DIR)) {
      console.error(`❌ Directory ${MINT_FOR_DIR} does not exist`);
      return mintForHashes;
    }

    // Get all mint-for-page files
    const files = fs
      .readdirSync(MINT_FOR_DIR)
      .filter(
        (file) => file.startsWith("mint-for-page-") && file.endsWith(".json")
      )
      .sort();

    console.log(`📋 Found ${files.length} mint_for transaction files`);

    for (const file of files) {
      const filePath = path.join(MINT_FOR_DIR, file);
      console.log(`📖 Reading file: ${file}`);

      try {
        const fileContent = fs.readFileSync(filePath, "utf8");
        const transactions = JSON.parse(fileContent);

        if (Array.isArray(transactions)) {
          transactions.forEach((tx: any) => {
            if (tx.hash) {
              mintForHashes.add(tx.hash);
            }
          });
          console.log(
            `   ✅ Loaded ${transactions.length} transactions from ${file}`
          );
        } else {
          console.log(
            `   ⚠️  File ${file} does not contain an array of transactions`
          );
        }
      } catch (error) {
        console.error(`   ❌ Error reading file ${file}:`, error);
      }
    }

    console.log(
      `📊 Total unique mint_for transaction hashes: ${mintForHashes.size}`
    );
    return mintForHashes;
  } catch (error) {
    console.error("Error loading mint_for transactions:", error);
    return mintForHashes;
  }
}

function compareHashes(allTransactions: any[], mintForHashes: Set<string>) {
  console.log("\n🔍 Comparing transaction hashes...");

  const allHashes = new Set<string>();
  const missingFromMintFor: string[] = [];
  const missingFromAll: string[] = [];

  // Extract all transaction hashes
  allTransactions.forEach((tx) => {
    if (tx.hash) {
      allHashes.add(tx.hash);
    }
  });

  console.log(`📊 Total unique transaction hashes: ${allHashes.size}`);
  console.log(
    `📊 Total unique mint_for transaction hashes: ${mintForHashes.size}`
  );

  // Find hashes that are in all transactions but not in mint_for
  allHashes.forEach((hash) => {
    if (!mintForHashes.has(hash)) {
      missingFromMintFor.push(hash);
    }
  });

  // Find hashes that are in mint_for but not in all transactions
  mintForHashes.forEach((hash) => {
    if (!allHashes.has(hash)) {
      missingFromAll.push(hash);
    }
  });

  console.log(`\n📈 Comparison Results:`);
  console.log(
    `🔴 Hashes in all transactions but missing from mint_for: ${missingFromMintFor.length}`
  );
  console.log(
    `🟡 Hashes in mint_for but missing from all transactions: ${missingFromAll.length}`
  );

  return {
    missingFromMintFor,
    missingFromAll,
    totalAllHashes: allHashes.size,
    totalMintForHashes: mintForHashes.size,
  };
}

function saveComparisonResults(results: any) {
  const timestamp = Date.now();
  const filename = `hash-comparison-${TARGET_ACCOUNT.substring(
    0,
    10
  )}-${timestamp}.json`;

  const comparisonData = {
    summary: {
      totalAllHashes: results.totalAllHashes,
      totalMintForHashes: results.totalMintForHashes,
      missingFromMintFor: results.missingFromMintFor.length,
      missingFromAll: results.missingFromAll.length,
      timestamp: new Date().toISOString(),
    },
    missingFromMintFor: results.missingFromMintFor,
    missingFromAll: results.missingFromAll,
  };

  fs.writeFileSync(filename, JSON.stringify(comparisonData, null, 2));
  console.log(`\n💾 Comparison results saved to: ${filename}`);

  // Also save as CSV for easier analysis
  const csvFilename = `hash-comparison-${TARGET_ACCOUNT.substring(
    0,
    10
  )}-${timestamp}.csv`;
  let csvContent = "hash,status\n";

  results.missingFromMintFor.forEach((hash: string) => {
    csvContent += `${hash},missing_from_mint_for\n`;
  });

  results.missingFromAll.forEach((hash: string) => {
    csvContent += `${hash},missing_from_all\n`;
  });

  fs.writeFileSync(csvFilename, csvContent);
  console.log(`📊 CSV results saved to: ${csvFilename}`);
}

async function main() {
  try {
    console.log("🎯 Target account:", TARGET_ACCOUNT);
    console.log("🚀 Starting hash comparison analysis...");

    // Load mint_for transaction hashes
    const mintForHashes = loadMintForTransactions();

    if (mintForHashes.size === 0) {
      console.log("❌ No mint_for transactions found. Exiting.");
      return;
    }

    // Get all transactions
    const allTransactions = await getAllAccountTransactions(100);

    if (allTransactions.length === 0) {
      console.log("❌ No transactions found. Exiting.");
      return;
    }

    // Compare hashes
    const comparisonResults = compareHashes(allTransactions, mintForHashes);

    // Save results
    saveComparisonResults(comparisonResults);

    console.log("\n🎉 Hash comparison completed successfully!");
  } catch (error) {
    console.error("❌ Error in main function:", error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);












