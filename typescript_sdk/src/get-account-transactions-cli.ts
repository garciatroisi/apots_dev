import {
  aptos,
  getAccountAddress,
  getNetworkName,
  isAccountConfigured,
} from "./config/aptos-client";

// Check if account is configured
if (!isAccountConfigured()) {
  console.error(
    "Error: APTOS_ACCOUNT_PRIVATE_KEY not configured in environment variables"
  );
  process.exit(1);
}

console.log("Network:", getNetworkName());

interface TransactionData {
  version: string;
  hash: string;
  state_change_hash: string;
  event_root_hash: string;
  state_checkpoint_hash?: string;
  gas_used: string;
  success: boolean;
  vm_status: string;
  accumulator_root_hash: string;
  changes: any[];
  timestamp: string;
  type: string;
}

async function getAllAccountTransactions(
  accountAddress: string,
  pageSize: number = 100
): Promise<TransactionData[]> {
  const allTransactions: TransactionData[] = [];
  let start: number | undefined = undefined;
  let hasMore = true;

  console.log(`Fetching transactions for account: ${accountAddress}`);
  console.log(`Page size: ${pageSize}`);

  try {
    while (hasMore) {
      console.log(`Fetching page starting from: ${start || "beginning"}`);

      const options = {
        limit: pageSize,
        ...(start !== undefined && { start }),
      };

      const response = await aptos.getAccountTransactions({
        accountAddress,
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
        start = parseInt(lastTransaction.version) + 1;
        console.log(`Next page will start from version: ${start}`);
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
  const successfulTransactions = transactions.filter((tx) => tx.success).length;
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
    const type = tx.type || "unknown";
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
    console.log(
      `  ${index + 1}. Version: ${tx.version}, Hash: ${tx.hash.substring(
        0,
        10
      )}..., Success: ${tx.success}, Type: ${tx.type}`
    );
  });
}

function parseArguments() {
  const args = process.argv.slice(2);
  const accountAddress = args[0];
  const pageSize = args[1] ? parseInt(args[1]) : 100;

  if (!accountAddress) {
    console.log(
      "Usage: npm run get-transactions-cli [account_address] [page_size]"
    );
    console.log("Example: npm run get-transactions-cli 0x123... 100");
    console.log(
      "If no account address is provided, will use the default account: 0x80f686c7bba12a0fce839ff160cb69774715497288996b861528727ccd256cdb"
    );
    return { accountAddress: null, pageSize };
  }

  return { accountAddress, pageSize };
}

async function main() {
  try {
    const { accountAddress: cliAccountAddress, pageSize } = parseArguments();

    // Use CLI account address if provided, otherwise use the default account
    const defaultAccount =
      "0x80f686c7bba12a0fce839ff160cb69774715497288996b861528727ccd256cdb";
    const accountAddress = cliAccountAddress || defaultAccount;

    console.log("Default account:", defaultAccount);
    console.log("Target address:", accountAddress);

    console.log("Starting transaction retrieval...");
    const transactions = await getAllAccountTransactions(
      accountAddress,
      pageSize
    );

    // Analyze the transactions
    await analyzeTransactions(transactions);

    // Save to file if there are transactions
    if (transactions.length > 0) {
      const fs = require("fs");
      const timestamp = Date.now();
      const filename = `account-transactions-${accountAddress.substring(
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
