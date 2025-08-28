import { aptos, getNetworkName } from "./config/aptos-client";

console.log("Network:", getNetworkName());

// Specific account address to always use
const TARGET_ACCOUNT =
  "0x80f686c7bba12a0fce839ff160cb69774715497288996b861528727ccd256cdb";

async function getFirstTransactions(limit: number = 100) {
  console.log(`Fetching first ${limit} transactions for account: ${TARGET_ACCOUNT}`);

  try {
    const response = await aptos.getAccountTransactions({
      accountAddress: TARGET_ACCOUNT,
      options: {
        limit,
      },
    });

    console.log(`Retrieved ${response.length} transactions`);
    return response;

  } catch (error) {
    console.error("Error fetching transactions:", error);
    throw error;
  }
}

async function analyzeTransactions(transactions: any[]) {
  console.log("\n=== Transaction Analysis ===");

  const totalTransactions = transactions.length;
  const successfulTransactions = transactions.filter(
    (tx) => "success" in tx && tx.success
  ).length;
  const failedTransactions = totalTransactions - successfulTransactions;

  console.log(`Total transactions: ${totalTransactions}`);
  console.log(`Successful transactions: ${successfulTransactions}`);
  console.log(`Failed transactions: ${failedTransactions}`);
  console.log(
    `Success rate: ${(
      (successfulTransactions / totalTransactions) *
      100
    ).toFixed(2)}%`
  );

  // Show first 5 transactions
  console.log("\nFirst 5 transactions:");
  const firstTransactions = transactions.slice(0, 5);
  firstTransactions.forEach((tx, index) => {
    const version = "version" in tx ? tx.version : "N/A";
    const hash = "hash" in tx ? tx.hash.substring(0, 10) + "..." : "N/A";
    const success = "success" in tx ? tx.success : "N/A";
    const type = "type" in tx ? tx.type : "N/A";

    console.log(
      `  ${
        index + 1
      }. Version: ${version}, Hash: ${hash}, Success: ${success}, Type: ${type}`
    );
  });

  // Show last 5 transactions
  console.log("\nLast 5 transactions:");
  const lastTransactions = transactions.slice(-5);
  lastTransactions.forEach((tx, index) => {
    const version = "version" in tx ? tx.version : "N/A";
    const hash = "hash" in tx ? tx.hash.substring(0, 10) + "..." : "N/A";
    const success = "success" in tx ? tx.success : "N/A";
    const type = "type" in tx ? tx.type : "N/A";

    console.log(
      `  ${
        index + 1
      }. Version: ${version}, Hash: ${hash}, Success: ${success}, Type: ${type}`
    );
  });
}

async function main() {
  try {
    console.log("Target account:", TARGET_ACCOUNT);
    console.log("Starting transaction retrieval...");

    const transactions = await getFirstTransactions(100);

    // Analyze the transactions
    await analyzeTransactions(transactions);

    // Save to file if there are transactions
    if (transactions.length > 0) {
      const fs = require("fs");
      const timestamp = Date.now();
      const filename = `first-100-transactions-${TARGET_ACCOUNT.substring(
        0,
        10
      )}-${timestamp}.json`;

      fs.writeFileSync(filename, JSON.stringify(transactions, null, 2));
      console.log(`\nTransactions saved to: ${filename}`);
    }
  } catch (error) {
    console.error("Error in main function:", error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);












