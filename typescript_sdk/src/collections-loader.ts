import * as fs from "fs/promises";
import * as path from "path";

export interface CollectionInfo {
  address: string;
  name: string;
}

// Generate sample collections for testing
export function generateSampleCollections(count: number): CollectionInfo[] {
  const collections: CollectionInfo[] = [];

  for (let i = 1; i <= count; i++) {
    collections.push({
      address: `0x${i.toString().padStart(64, "0")}`,
      name: `Sample Collection ${i}`,
    });
  }

  return collections;
}

// Load collections from JSON file
export async function loadCollectionsFromFile(
  filePath: string
): Promise<CollectionInfo[]> {
  try {
    const data = await fs.readFile(filePath, "utf8");
    const collections = JSON.parse(data);

    // Validate the structure
    if (!Array.isArray(collections)) {
      throw new Error("Collections file must contain an array");
    }

    // Validate each collection has required fields
    collections.forEach((collection, index) => {
      if (!collection.address || !collection.name) {
        throw new Error(
          `Collection at index ${index} missing required fields (address, name)`
        );
      }
    });

    console.log(`✅ Loaded ${collections.length} collections from ${filePath}`);
    return collections;
  } catch (error) {
    console.error(`❌ Error loading collections from ${filePath}:`, error);
    throw error;
  }
}

// Save collections to JSON file
export async function saveCollectionsToFile(
  collections: CollectionInfo[],
  filePath: string
): Promise<void> {
  try {
    const data = JSON.stringify(collections, null, 2);
    await fs.writeFile(filePath, data, "utf8");
    console.log(`✅ Saved ${collections.length} collections to ${filePath}`);
  } catch (error) {
    console.error(`❌ Error saving collections to ${filePath}:`, error);
    throw error;
  }
}

// Create a sample collections file
export async function createSampleCollectionsFile(
  count: number = 10,
  filePath: string = "./sample-collections.json"
): Promise<void> {
  const collections = generateSampleCollections(count);
  await saveCollectionsToFile(collections, filePath);
}

// Load collections with fallback to sample data
export async function loadCollections(
  filePath?: string,
  fallbackCount: number = 10
): Promise<CollectionInfo[]> {
  if (filePath) {
    try {
      return await loadCollectionsFromFile(filePath);
    } catch (error) {
      console.log(
        `⚠️  Could not load from ${filePath}, using sample data instead`
      );
    }
  }

  console.log(`📝 Using ${fallbackCount} sample collections`);
  return generateSampleCollections(fallbackCount);
}

// Example usage and testing
async function main() {
  try {
    // Create a sample file with 10 collections
    await createSampleCollectionsFile(10, "./sample-collections.json");

    // Load the collections
    const collections = await loadCollectionsFromFile(
      "./sample-collections.json"
    );

    console.log("Sample collections:");
    collections.forEach((collection, index) => {
      console.log(`${index + 1}. ${collection.name} - ${collection.address}`);
    });
  } catch (error) {
    console.error("Error in main:", error);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

