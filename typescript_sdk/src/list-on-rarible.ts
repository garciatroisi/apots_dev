import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Nueva interfaz para el formato correcto de la orden en Rarible
interface RaribleOrder {
  blockchain: string;
  data: {
    "@type": string;
    // Puedes agregar más campos si la doc lo requiere
  };
  make: {
    assetType: {
      blockchain: string;
      "@type": string;
      // Puedes agregar contract/tokenId si es necesario para NFTs
    };
    value: number;
  };
  take: {
    assetType: {
      blockchain: string;
      "@type": string;
      // Puedes agregar contract/tokenId si es necesario
    };
    value: number;
  };
  // Puedes agregar más campos si la doc lo requiere
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

// Función para crear la orden siguiendo el formato correcto
async function createListingOrder(
  price: number,
  quantity: number = 1
): Promise<RaribleOrder> {
  // NOTA: Ajusta el @type de data según la doc de Rarible para Aptos
  // Si no existe uno específico para Aptos, usa el que corresponda
  return {
    blockchain: "APTOS",
    data: {
      "@type": "APTOS_RARIBLE_V2", // Cambia esto si la doc indica otro valor
    },
    make: {
      assetType: {
        blockchain: "APTOS",
        "@type": "CURRENCY_NATIVE", // O ERC721 si es NFT
        // Si es NFT, agrega contract y tokenId aquí
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
    // Agrega más campos si la doc lo requiere
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
