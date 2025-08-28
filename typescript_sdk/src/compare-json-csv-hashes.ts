import * as fs from "fs";
import * as path from "path";

// Directory containing mint_for transaction files
const MINT_FOR_DIR = "creator_transacrtions";
const CSV_FILE = "src/DISTINCT_HASHES.csv";

function loadMintForHashes(): Set<string> {
  console.log(
    `📁 Loading mint_for transaction hashes from directory: ${MINT_FOR_DIR}`
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

function loadCSVHashes(): Set<string> {
  console.log(`📁 Loading hashes from CSV file: ${CSV_FILE}`);

  const csvHashes = new Set<string>();

  try {
    // Check if file exists
    if (!fs.existsSync(CSV_FILE)) {
      console.error(`❌ CSV file ${CSV_FILE} does not exist`);
      return csvHashes;
    }

    const fileContent = fs.readFileSync(CSV_FILE, "utf8");
    const lines = fileContent.split("\n");

    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line && line.trim() && line.trim().startsWith('"0x')) {
        // Remove quotes and add to set
        const hash = line.trim().replace(/"/g, "");
        csvHashes.add(hash);
      }
    }

    console.log(`📊 Total unique CSV hashes: ${csvHashes.size}`);
    return csvHashes;
  } catch (error) {
    console.error("Error loading CSV hashes:", error);
    return csvHashes;
  }
}

function compareHashes(mintForHashes: Set<string>, csvHashes: Set<string>) {
  console.log("\n🔍 Comparing transaction hashes...");

  const missingFromCSV: string[] = [];
  const missingFromMintFor: string[] = [];

  // Find hashes that are in mint_for but not in CSV
  mintForHashes.forEach((hash) => {
    if (!csvHashes.has(hash)) {
      missingFromCSV.push(hash);
    }
  });

  // Find hashes that are in CSV but not in mint_for
  csvHashes.forEach((hash) => {
    if (!mintForHashes.has(hash)) {
      missingFromMintFor.push(hash);
    }
  });

  console.log(`\n📈 Comparison Results:`);
  console.log(
    `🔴 Hashes in mint_for but missing from CSV: ${missingFromCSV.length}`
  );
  console.log(
    `🟡 Hashes in CSV but missing from mint_for: ${missingFromMintFor.length}`
  );
  console.log(`📊 Total mint_for hashes: ${mintForHashes.size}`);
  console.log(`📊 Total CSV hashes: ${csvHashes.size}`);

  return {
    missingFromCSV,
    missingFromMintFor,
    totalMintForHashes: mintForHashes.size,
    totalCSVHashes: csvHashes.size,
  };
}

function saveComparisonResults(results: any) {
  const timestamp = Date.now();
  const filename = `hash-comparison-json-csv-${timestamp}.json`;

  const comparisonData = {
    summary: {
      totalMintForHashes: results.totalMintForHashes,
      totalCSVHashes: results.totalCSVHashes,
      missingFromCSV: results.missingFromCSV.length,
      missingFromMintFor: results.missingFromMintFor.length,
      timestamp: new Date().toISOString(),
    },
    missingFromCSV: results.missingFromCSV,
    missingFromMintFor: results.missingFromMintFor,
  };

  fs.writeFileSync(filename, JSON.stringify(comparisonData, null, 2));
  console.log(`\n💾 Comparison results saved to: ${filename}`);

  // Also save as CSV for easier analysis
  const csvFilename = `hash-comparison-json-csv-${timestamp}.csv`;
  let csvContent = "hash,status\n";

  results.missingFromCSV.forEach((hash: string) => {
    csvContent += `${hash},missing_from_csv\n`;
  });

  results.missingFromMintFor.forEach((hash: string) => {
    csvContent += `${hash},missing_from_mint_for\n`;
  });

  fs.writeFileSync(csvFilename, csvContent);
  console.log(`📊 CSV results saved to: ${csvFilename}`);

  // Save only missing from CSV as separate file
  if (results.missingFromCSV.length > 0) {
    const missingFromCSVFilename = `missing-from-csv-${timestamp}.csv`;
    let missingCSVContent = "hash\n";
    results.missingFromCSV.forEach((hash: string) => {
      missingCSVContent += `${hash}\n`;
    });
    fs.writeFileSync(missingFromCSVFilename, missingCSVContent);
    console.log(`🔴 Missing from CSV saved to: ${missingFromCSVFilename}`);
  }

  // Save only missing from mint_for as separate file
  if (results.missingFromMintFor.length > 0) {
    const missingFromMintForFilename = `missing-from-mint-for-${timestamp}.csv`;
    let missingMintForContent = "hash\n";
    results.missingFromMintFor.forEach((hash: string) => {
      missingMintForContent += `${hash}\n`;
    });
    fs.writeFileSync(missingFromMintForFilename, missingMintForContent);
    console.log(
      `🟡 Missing from mint_for saved to: ${missingFromMintForFilename}`
    );
  }
}

async function main() {
  try {
    console.log("🚀 Starting JSON vs CSV hash comparison analysis...");

    // Load mint_for transaction hashes
    const mintForHashes = loadMintForHashes();

    if (mintForHashes.size === 0) {
      console.log("❌ No mint_for transactions found. Exiting.");
      return;
    }

    // Load CSV hashes
    const csvHashes = loadCSVHashes();

    if (csvHashes.size === 0) {
      console.log("❌ No CSV hashes found. Exiting.");
      return;
    }

    // Compare hashes
    const comparisonResults = compareHashes(mintForHashes, csvHashes);

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
