import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// New interface for the correct order format in Rarible
interface RaribleOrder {
  blockchain: string;
  data: {
    "@type": string;
    // You can add more fields if the documentation requires it
  };
  make: {
    assetType: {
      blockchain: string;
      "@type": string;
      // You can add contract/tokenId if necessary for NFTs
    };
    value: number;
  };
  take: {
    assetType: {
      blockchain: string;
      "@type": string;
      // You can add contract/tokenId if necessary
    };
    value: number;
  };
  // You can add more fields if the documentation requires it
}

interface AptosNFTMetadata {
  tokenId: string;
  collection: string;
  name: string;
  description?: string;
  uri?: string;
  royalty_payee_address?: string;
  royalty_points_denominator?: number;
  royalty_points_numerator?: number;
  property_keys?: string[];
  property_values?: string[];
  property_types?: string[];
}

// Configuration
// const RARIBLE_API_BASE_URL = "https://api.rarible.org/v0.1";
const RARIBLE_API_BASE_URL = "https://testnet-api.rarible.org/v0.1";
const RARIBLE_API_KEY = process.env.RARIBLE_API_KEY || "";

// Function to create the order following the correct format
async function createListingOrder(
  price: number,
  quantity: number = 1
): Promise<RaribleOrder> {
  // NOTE: Adjust the @type of data according to Rarible documentation for Aptos
  // If there's no specific one for Aptos, use the corresponding one
  return {
    blockchain: "APTOS",
    data: {
      "@type": "APTOS_RARIBLE_V2", // Change this if the documentation indicates another value
    },
    make: {
      assetType: {
        blockchain: "APTOS",
        "@type": "CURRENCY_NATIVE", // Or ERC721 if it's an NFT
        // If it's an NFT, add contract and tokenId here
      },
      value: quantity,
    },
    take: {
      assetType: {
        blockchain: "APTOS",
        "@type": "CURRENCY_NATIVE",
      },
      value: price,
    },
    // Add more fields if the documentation requires it
  };
}

// Function to submit order to Rarible API
async function submitOrderToRarible(order: RaribleOrder): Promise<any> {
  if (!RARIBLE_API_KEY) {
    throw new Error("RARIBLE_API_KEY environment variable is required");
  }

  const response = await fetch(`${RARIBLE_API_BASE_URL}/orders`, {
    method: "POST",
    headers: {
      "X-API-KEY": RARIBLE_API_KEY,
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(order),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to submit order to Rarible: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  return await response.json();
}

// Function to list a single NFT
async function listSingleNFT(
  contract: string,
  tokenId: string,
  price: number,
  quantity: number = 1,
  durationDays: number = 30
): Promise<any> {
  console.log("📝 Listing single NFT on Rarible...");
  console.log(`  Contract: ${contract}`);
  console.log(`  Token ID: ${tokenId}`);
  console.log(`  Price: ${price} APT`);
  console.log(`  Quantity: ${quantity}`);
  console.log(`  Duration: ${durationDays} days`);

  try {
    const order = await createListingOrder(price, quantity);

    const result = await submitOrderToRarible(order);
    console.log(`  ✅ Successfully listed! Order ID: ${result.id}`);
    console.log("\n🎉 NFT listed successfully on Rarible!");

    return result;
  } catch (error) {
    console.error(`  ❌ Failed to list NFT:`, error);
    throw error;
  }
}

// Main function to demonstrate usage
async function main() {
  try {
    console.log("🚀 Rarible NFT Listing Script for Aptos");
    console.log("========================================");

    // Check if API key is configured
    if (!RARIBLE_API_KEY) {
      console.error("❌ RARIBLE_API_KEY environment variable is not set");
      console.log("Please add your Rarible API key to your .env file:");
      console.log("RARIBLE_API_KEY=your-api-key-here");
      return;
    }

    // Single NFT to list
    const contract =
      "0x1050230722a4eed997212a9ae5168d27bf66d82d5b3116d32bdcf882f953639a"; //collection_id
    const tokenId =
      "0xfefbdc6f9c5e2211d88fa5f15485a3db281729f3399baefe9f8b4cb9b4d2dc1b"; //token_id
    const price = 0.5; // 0.5 APT
    const quantity = 1;
    const durationDays = 30;

    // List the single NFT
    await listSingleNFT(contract, tokenId, price, quantity, durationDays);
  } catch (error) {
    console.error("❌ Error in main function:", error);
  }
}

// Export functions for use in other modules
export {
  createListingOrder,
  submitOrderToRarible,
  listSingleNFT,
  RaribleOrder,
  AptosNFTMetadata,
};

// Run the script if called directly
if (require.main === module) {
  main();
}
