import { aptos, getNetworkName } from "./config/aptos-client";

console.log("Network:", getNetworkName());

// Specific account address to always use
const TARGET_ACCOUNT =
  "0x80f686c7bba12a0fce839ff160cb69774715497288996b861528727ccd256cdb";

// Use the actual TransactionResponse type from the SDK
type TransactionData = any;

async function getAllAccountTransactions(
  pageSize: number = 100
): Promise<TransactionData[]> {
  const allTransactions: TransactionData[] = [];
  let start: number | undefined = undefined;
  let hasMore = true;

  console.log(`Fetching transactions for account: ${TARGET_ACCOUNT}`);
  console.log(`Page size: ${pageSize}`);

  try {
    while (hasMore) {
      console.log(`Fetching page starting from: ${start || "beginning"}`);

      const options = {
        limit: pageSize,
        ...(start !== undefined && { start }),
      };

      const response = await aptos.getAccountTransactions({
        accountAddress: TARGET_ACCOUNT,
        options,
      });

      console.log(`Retrieved ${response.length} transactions`);

      if (response.length === 0) {
        hasMore = false;
        console.log("No more transactions to fetch");
        break;
      }

      // Add transactions to our collection
      allTransactions.push(...response);

      // Check if we got a full page (meaning there might be more)
      if (response.length < pageSize) {
        hasMore = false;
        console.log("Reached the end of transactions");
      } else {
        // Set the start parameter for the next page
        // Use the version of the last transaction as the starting point
        const lastTransaction = response[response.length - 1];
        if (lastTransaction && "version" in lastTransaction) {
          start = parseInt(lastTransaction.version) + 1;
          console.log(`Next page will start from version: ${start}`);
        } else {
          hasMore = false;
          console.log(
            "Could not determine next page start, stopping pagination"
          );
        }
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

async function analyzeTransactions(transactions: TransactionData[]) {
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

  // Group by transaction type
  const typeCount: { [key: string]: number } = {};
  transactions.forEach((tx) => {
    const type = "type" in tx ? tx.type : "unknown";
    typeCount[type] = (typeCount[type] || 0) + 1;
  });

  console.log("\nTransaction types:");
  Object.entries(typeCount).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });

  // Show recent transactions
  console.log("\nMost recent 5 transactions:");
  const recentTransactions = transactions.slice(0, 5);
  recentTransactions.forEach((tx, index) => {
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

    const transactions = await getAllAccountTransactions(100);

    // Analyze the transactions
    await analyzeTransactions(transactions);

    // Save to file if there are transactions
    if (transactions.length > 0) {
      const fs = require("fs");
      const timestamp = Date.now();
      const filename = `transactions-${TARGET_ACCOUNT.substring(
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
