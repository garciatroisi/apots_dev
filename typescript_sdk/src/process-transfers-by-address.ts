import * as fs from "fs";
import * as path from "path";

// Interface for transfer information
interface TransferInfo {
  tokenId: string;
  to: string;
}

// Interface for grouped transfers by address
interface AddressTokens {
  [address: string]: string[];
}

// Function to process all transfer files and group by address
async function processTransfersByAddress(): Promise<void> {
  try {
    console.log("🔍 Processing transfer files...");

    const tokensToReturnDir = path.join(__dirname, "../TokensToReturn");
    const files = fs.readdirSync(tokensToReturnDir);

    // Filter only JSON files
    const jsonFiles = files.filter((file) => file.endsWith(".json"));

    console.log(`📁 Found ${jsonFiles.length} JSON files to process`);

    // Object to store tokens grouped by address
    const addressTokens: AddressTokens = {};
    let totalTransfers = 0;

    // Process each file
    for (const file of jsonFiles) {
      console.log(`\n📄 Processing file: ${file}`);

      const filePath = path.join(tokensToReturnDir, file);
      const fileContent = fs.readFileSync(filePath, "utf8");

      try {
        const transfers: TransferInfo[] = JSON.parse(fileContent);

        console.log(`   Found ${transfers.length} transfers in this file`);
        totalTransfers += transfers.length;

        // Group tokens by address
        transfers.forEach((transfer) => {
          const address = transfer.to;
          const tokenId = transfer.tokenId;

          if (!addressTokens[address]) {
            addressTokens[address] = [];
          }

          // Only add if not already present (avoid duplicates)
          if (!addressTokens[address].includes(tokenId)) {
            addressTokens[address].push(tokenId);
          }
        });
      } catch (error) {
        console.error(`❌ Error parsing file ${file}:`, error);
      }
    }

    // Display results
    console.log(`\n🎉 Processing Complete!`);
    console.log(`📊 Total transfers processed: ${totalTransfers}`);
    console.log(
      `👥 Unique addresses found: ${Object.keys(addressTokens).length}`
    );

    // Show summary by address
    console.log(`\n📋 Summary by address:`);
    Object.entries(addressTokens).forEach(([address, tokens]) => {
      console.log(
        `   ${address.substring(0, 10)}... (${tokens.length} tokens)`
      );
    });

    // Save grouped results
    const timestamp = Date.now();
    const outputFilename = `address-tokens-grouped-${timestamp}.json`;
    const outputPath = path.join(__dirname, "..", outputFilename);

    fs.writeFileSync(outputPath, JSON.stringify(addressTokens, null, 2));
    console.log(`\n💾 Grouped results saved to: ${outputFilename}`);

    // Also save a summary file with counts
    const summaryData = Object.entries(addressTokens).map(
      ([address, tokens]) => ({
        address,
        tokenCount: tokens.length,
        tokens: tokens,
      })
    );

    const summaryFilename = `address-summary-${timestamp}.json`;
    const summaryPath = path.join(__dirname, "..", summaryFilename);

    fs.writeFileSync(summaryPath, JSON.stringify(summaryData, null, 2));
    console.log(`📊 Summary with counts saved to: ${summaryFilename}`);

    // Show top addresses by token count
    console.log(`\n🏆 Top 10 addresses by token count:`);
    const sortedAddresses = Object.entries(addressTokens)
      .sort(([, tokensA], [, tokensB]) => tokensB.length - tokensA.length)
      .slice(0, 10);

    sortedAddresses.forEach(([address, tokens], index) => {
      console.log(
        `   ${index + 1}. ${address.substring(0, 10)}... (${
          tokens.length
        } tokens)`
      );
    });
  } catch (error) {
    console.error("❌ Error processing transfers:", error);
    throw error;
  }
}

// Run the script
processTransfersByAddress().catch(console.error);
