import { aptos, getNetworkName } from "./config/aptos-client";

console.log("Network:", getNetworkName());

// Transaction hash to analyze
const TRANSACTION_HASH =
  "0x5a83ae1766ed4052265e34c14dca200c7c148f2618a0534b49d149d19f268085";

// Type guard to ensure transaction has events
const hasEvents = (tx: any): tx is { events: any[] } =>
  Array.isArray(tx.events);

// Interface for transfer information (simplified)
interface TransferInfo {
  tokenId: string;
  to: string;
}

// Function to extract transfer information from transfer events (simplified)
function extractTransferFromEvent(event: any): TransferInfo | null {
  try {
    // Check if it's a transfer event
    if (event.type.includes("Transfer") || event.type.includes("transfer")) {
      const tokenId =
        event.data?.token ||
        event.data?.object ||
        event.data?.token_id ||
        event.data?.id;
      const to = event.data?.to;

      if (tokenId && to) {
        return {
          tokenId: tokenId,
          to: to,
        };
      }
    }

    return null;
  } catch (error) {
    console.error("Error extracting transfer from event:", error);
    return null;
  }
}

// Function to analyze transaction and extract only transfers
async function analyzeTransactionTransfers(
  transactionHash: string
): Promise<void> {
  try {
    console.log(`🔍 Analyzing transaction: ${transactionHash}`);
    console.log(`📡 Fetching transaction details...`);

    // Get transaction details
    const txnDetails = await aptos.getTransactionByHash({
      transactionHash: transactionHash,
    });

    console.log(`✅ Transaction found!`);

    // Check if transaction has events
    if (!hasEvents(txnDetails)) {
      console.log(`⚠️  Transaction does not contain events`);
      return;
    }

    console.log(`📋 Found ${txnDetails.events.length} events`);

    // Extract only transfers from events
    const transfers: TransferInfo[] = [];

    txnDetails.events.forEach((event: any, index: number) => {
      const transferInfo = extractTransferFromEvent(event);
      if (transferInfo) {
        transfers.push(transferInfo);
        console.log(
          `   🔄 Transfer found: ${
            transferInfo.tokenId
          } to ${transferInfo.to.substring(0, 10)}...`
        );
      }
    });

    // Display results
    console.log(`\n🎉 Analysis Complete!`);
    console.log(`📊 Total transfers found: ${transfers.length}`);

    // Save only transfers as simple JSON
    const fs = require("fs");
    const timestamp = Date.now();
    const filename = `transfers-${transactionHash.substring(
      0,
      10
    )}-${timestamp}.json`;

    fs.writeFileSync(filename, JSON.stringify(transfers, null, 2));
    console.log(`\n💾 Transfers saved to: ${filename}`);

    if (transfers.length === 0) {
      console.log(`\n❌ No transfers found in this transaction`);
    }
  } catch (error: any) {
    console.error("❌ Error analyzing transaction:", error);

    // Check if it's a transaction not found error
    if (error.message && error.message.includes("not found")) {
      console.log(
        `💡 Transaction not found. Make sure the hash is correct and the transaction exists on the network.`
      );
    }

    throw error;
  }
}

async function main() {
  try {
    console.log("🎯 Transaction to analyze:", TRANSACTION_HASH);
    console.log("🚀 Starting transfer analysis...");

    await analyzeTransactionTransfers(TRANSACTION_HASH);
  } catch (error) {
    console.error("❌ Error in main function:", error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
