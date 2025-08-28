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

// Function to convert individual transfers to grouped format
async function convertToGroupedFormat(): Promise<void> {
  try {
    console.log("🔄 Converting file to grouped format...");

    const inputFile = path.join(
      __dirname,
      "../transfers-0x5a83ae17-1755785860383.json"
    );
    const outputFile = path.join(
      __dirname,
      "../transfers-0x5a83ae17-grouped.json"
    );

    // Read the input file
    const fileContent = fs.readFileSync(inputFile, "utf8");
    const transfers: TransferInfo[] = JSON.parse(fileContent);

    console.log(`📄 Found ${transfers.length} transfers in the file`);

    // Group tokens by address
    const addressTokens: AddressTokens = {};

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

    // Display results
    console.log(
      `👥 Unique addresses found: ${Object.keys(addressTokens).length}`
    );

    Object.entries(addressTokens).forEach(([address, tokens]) => {
      console.log(
        `   ${address.substring(0, 10)}... (${tokens.length} tokens)`
      );
    });

    // Save grouped results
    fs.writeFileSync(outputFile, JSON.stringify(addressTokens, null, 2));
    console.log(
      `\n💾 Grouped file saved to: transfers-0x5a83ae17-grouped.json`
    );
  } catch (error) {
    console.error("❌ Error converting file:", error);
    throw error;
  }
}

// Run the script
convertToGroupedFormat().catch(console.error);









