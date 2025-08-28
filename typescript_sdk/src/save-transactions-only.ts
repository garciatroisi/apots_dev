import { aptos, getNetworkName } from "./config/aptos-client";

console.log("Network:", getNetworkName());

// Specific account address to always use
const TARGET_ACCOUNT =
  "0x80f686c7bba12a0fce839ff160cb69774715497288996b861528727ccd256cdb";

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
      console.log(`Fetching page ${pageCount} with offset: ${offset}`);

      const response = await aptos.getAccountTransactions({
        accountAddress: TARGET_ACCOUNT,
        options: {
          limit: pageSize,
          offset: offset,
        },
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
        // Move to next page
        offset += pageSize;
        console.log(`Next page will start with offset: ${offset}`);
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

async function main() {
  try {
    console.log("Target account:", TARGET_ACCOUNT);
    console.log("Starting transaction retrieval...");

    const transactions = await getAllAccountTransactions(100);

    // Save to file if there are transactions
    if (transactions.length > 0) {
      const fs = require("fs");
      const timestamp = Date.now();
      const filename = `transactions-${TARGET_ACCOUNT.substring(
        0,
        10
      )}-${timestamp}.json`;

      fs.writeFileSync(filename, JSON.stringify(transactions, null, 2));
      console.log(`\n✅ Transactions saved to: ${filename}`);
      console.log(`📊 Total transactions: ${transactions.length}`);
    } else {
      console.log("❌ No transactions found");
    }
  } catch (error) {
    console.error("Error in main function:", error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);












