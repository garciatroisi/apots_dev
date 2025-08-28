import { aptos, getNetworkName } from "./config/aptos-client";

console.log("Network:", getNetworkName());

// Specific account address to always use
const TARGET_ACCOUNT =
  "0x80f686c7bba12a0fce839ff160cb69774715497288996b861528727ccd256cdb";

function filterMintForTransactions(transactions: any[]): any[] {
  const mintForTransactions = transactions.filter((tx) => {
    // Check if transaction has payload and function
    if (tx.payload && tx.payload.function) {
      return tx.payload.function.includes("mint_for");
    }
    return false;
  });

  return mintForTransactions;
}

function simplifyTransaction(tx: any) {
  return {
    version: tx.version,
    hash: tx.hash,
    timestamp: tx.timestamp,
    success: tx.success,
    function: tx.payload?.function,
    arguments: tx.payload?.function_arguments || [],
    type_arguments: tx.payload?.type_arguments || [],
    gas_used: tx.gas_used,
    vm_status: tx.vm_status,
  };
}

async function getAllAccountTransactionsPaginated(
  pageSize: number = 100
): Promise<void> {
  let offset = 0;
  let hasMore = true;
  let pageCount = 0;
  let totalMintForTransactions = 0;

  console.log(`Fetching all transactions for account: ${TARGET_ACCOUNT}`);
  console.log(`Page size: ${pageSize}`);

  try {
    while (hasMore) {
      pageCount++;
      console.log(`\n📄 Fetching page ${pageCount} with offset: ${offset}`);

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

      // Filter mint_for transactions from this page
      const mintForTransactions = filterMintForTransactions(response);

      if (mintForTransactions.length > 0) {
        // Simplify transactions
        const simplifiedTransactions =
          mintForTransactions.map(simplifyTransaction);

        // Save to file
        const fs = require("fs");
        const timestamp = Date.now();
        const filename = `mint-for-page-${pageCount}-${TARGET_ACCOUNT.substring(
          0,
          10
        )}-${timestamp}.json`;

        fs.writeFileSync(
          filename,
          JSON.stringify(simplifiedTransactions, null, 2)
        );

        console.log(
          `✅ Page ${pageCount}: Found ${mintForTransactions.length} mint_for transactions`
        );
        console.log(`💾 Saved to: ${filename}`);

        totalMintForTransactions += mintForTransactions.length;

        // Show first transaction from this page
        const firstTx = simplifiedTransactions[0];
        if (firstTx) {
          console.log(
            `   📋 First: Version ${
              firstTx.version
            }, Hash ${firstTx.hash.substring(0, 10)}...`
          );
        }
      } else {
        console.log(`📭 Page ${pageCount}: No mint_for transactions found`);
      }

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

    console.log(`\n🎉 Summary:`);
    console.log(`📊 Total pages processed: ${pageCount}`);
    console.log(
      `📊 Total mint_for transactions found: ${totalMintForTransactions}`
    );
  } catch (error) {
    console.error("❌ Error fetching transactions:", error);
    throw error;
  }
}

async function main() {
  try {
    console.log("🎯 Target account:", TARGET_ACCOUNT);
    console.log("🚀 Starting paginated transaction retrieval...");

    await getAllAccountTransactionsPaginated(100);
  } catch (error) {
    console.error("❌ Error in main function:", error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
