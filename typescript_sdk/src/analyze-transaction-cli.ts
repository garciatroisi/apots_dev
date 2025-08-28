import { aptos, getNetworkName } from "./config/aptos-client";

console.log("Network:", getNetworkName());

// Get transaction hash from command line arguments
const args = process.argv.slice(2);
const transactionHash = args[0];

if (!transactionHash) {
  console.error("❌ Error: Transaction hash is required");
  console.log("Usage: npm run analyze-transaction <transaction-hash>");
  console.log(
    "Example: npm run analyze-transaction 0x65c8ee51263124173f6e62e18e93c27e6f8aed260bcd3a3885c6c9ff9e792a7b"
  );
  process.exit(1);
}

// Type guard to ensure transaction has events
const hasEvents = (tx: any): tx is { events: any[] } =>
  Array.isArray(tx.events);

// Interface for token information
interface TokenInfo {
  tokenId: string;
  collection: string;
  name: string;
  description?: string;
  uri?: string;
  eventType: string;
  eventData: any;
}

// Interface for transfer information (simplified)
interface TransferInfo {
  tokenId: string;
  to: string;
}

// Function to extract token information from mint events
function extractTokenFromMintEvent(event: any): TokenInfo | null {
  try {
    // Check if it's a mint event
    if (event.type.includes("Mint") || event.type.includes("mint")) {
      const tokenId =
        event.data?.token || event.data?.token_id || event.data?.id;

      if (tokenId) {
        return {
          tokenId: tokenId,
          collection:
            event.data?.collection || event.data?.collection_name || "Unknown",
          name: event.data?.name || event.data?.token_name || "Unknown",
          description: event.data?.description,
          uri: event.data?.uri || event.data?.token_uri,
          eventType: event.type,
          eventData: event.data,
        };
      }
    }

    // Check for other token-related events
    if (event.type.includes("Token") || event.type.includes("token")) {
      const tokenId =
        event.data?.token || event.data?.token_id || event.data?.id;

      if (tokenId) {
        return {
          tokenId: tokenId,
          collection:
            event.data?.collection || event.data?.collection_name || "Unknown",
          name: event.data?.name || event.data?.token_name || "Unknown",
          description: event.data?.description,
          uri: event.data?.uri || event.data?.token_uri,
          eventType: event.type,
          eventData: event.data,
        };
      }
    }

    return null;
  } catch (error) {
    console.error("Error extracting token from event:", error);
    return null;
  }
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

// Function to analyze transaction and extract tokens
async function analyzeTransactionTokens(
  transactionHash: string
): Promise<void> {
  try {
    console.log(`🔍 Analyzing transaction: ${transactionHash}`);
    console.log(`📡 Fetching transaction details...`);

    // Try to get transaction directly first (faster for already committed transactions)
    let txnDetails;
    try {
      txnDetails = await aptos.getTransactionByHash({
        transactionHash: transactionHash,
      });
      console.log(`✅ Transaction found directly!`);
    } catch (error) {
      console.log(
        `⚠️  Could not get transaction directly, trying to wait for it...`
      );
      // If direct get fails, try waiting for transaction (useful for pending transactions)
      txnDetails = await aptos.waitForTransaction({
        transactionHash: transactionHash,
      });
      console.log(`✅ Transaction found after waiting!`);
    }

    console.log(`📊 Transaction version: ${txnDetails.version}`);
    console.log(`⏰ Timestamp: ${txnDetails.timestamp}`);
    console.log(`✅ Success: ${txnDetails.success}`);

    // Check if transaction has events
    if (!hasEvents(txnDetails)) {
      console.log(`⚠️  Transaction does not contain events`);
      console.log(`📋 Available fields:`, Object.keys(txnDetails));
      return;
    }

    console.log(`📋 Found ${txnDetails.events.length} events`);

    // Extract tokens and transfers from events
    const tokens: TokenInfo[] = [];
    const transfers: TransferInfo[] = [];

    txnDetails.events.forEach((event: any, index: number) => {
      console.log(`\n🔍 Analyzing event ${index + 1}:`);
      console.log(`   Type: ${event.type}`);
      console.log(`   Data keys:`, Object.keys(event.data || {}));

      // Check for mint events
      const tokenInfo = extractTokenFromMintEvent(event);
      if (tokenInfo) {
        tokens.push(tokenInfo);
        console.log(
          `   ✅ Token found: ${tokenInfo.name} (${tokenInfo.tokenId})`
        );
      }

      // Check for transfer events
      const transferInfo = extractTransferFromEvent(event);
      if (transferInfo) {
        transfers.push(transferInfo);
        console.log(
          `   🔄 Transfer found: ${
            transferInfo.tokenId
          } to ${transferInfo.to.substring(0, 10)}...`
        );
      }

      // If neither mint nor transfer found
      if (!tokenInfo && !transferInfo) {
        console.log(
          `   ❌ No token or transfer information found in this event`
        );
      }
    });

    // Display results
    console.log(`\n🎉 Analysis Complete!`);
    console.log(`📊 Total tokens found: ${tokens.length}`);
    console.log(`📊 Total transfers found: ${transfers.length}`);

    if (tokens.length > 0) {
      console.log(`\n📋 Tokens minted in this transaction:`);
      tokens.forEach((token, index) => {
        console.log(`\n   🎯 Token ${index + 1}:`);
        console.log(`      ID: ${token.tokenId}`);
        console.log(`      Collection: ${token.collection}`);
        console.log(`      Name: ${token.name}`);
        if (token.description) {
          console.log(`      Description: ${token.description}`);
        }
        if (token.uri) {
          console.log(`      URI: ${token.uri}`);
        }
        console.log(`      Event Type: ${token.eventType}`);
      });
    }

    if (transfers.length > 0) {
      console.log(`\n📋 Transfers in this transaction:`);
      transfers.forEach((transfer, index) => {
        console.log(`\n   🔄 Transfer ${index + 1}:`);
        console.log(`      Token ID: ${transfer.tokenId}`);
        console.log(`      To: ${transfer.to}`);
      });
    }

    // Save results to file
    const fs = require("fs");
    const timestamp = Date.now();
    const filename = `transaction-tokens-${transactionHash.substring(
      0,
      10
    )}-${timestamp}.json`;

    const results = {
      transactionHash: transactionHash,
      transactionVersion: txnDetails.version,
      timestamp: txnDetails.timestamp,
      success: txnDetails.success,
      totalTokensFound: tokens.length,
      totalTransfersFound: transfers.length,
      tokens: tokens,
      transfers: transfers,
      allEvents: txnDetails.events,
    };

    fs.writeFileSync(filename, JSON.stringify(results, null, 2));
    console.log(`\n💾 Results saved to: ${filename}`);

    if (tokens.length === 0 && transfers.length === 0) {
      console.log(`\n❌ No tokens or transfers found in this transaction`);
      console.log(
        `💡 This might be a different type of transaction or the tokens were not minted in this specific transaction`
      );

      // Show all event types for debugging
      console.log(`\n🔍 All event types in this transaction:`);
      txnDetails.events.forEach((event: any, index: number) => {
        console.log(`   ${index + 1}. ${event.type}`);
      });
    }
  } catch (error) {
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
    console.log("🎯 Transaction to analyze:", transactionHash);
    console.log("🚀 Starting transaction analysis...");

    await analyzeTransactionTokens(transactionHash);
  } catch (error) {
    console.error("❌ Error in main function:", error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
