import {
  generateSampleCollections,
  saveCollectionsToFile,
} from "./collections-loader";

async function main() {
  try {
    console.log("🚀 Generating 700 sample collections...");

    // Generate 700 sample collections
    const collections = generateSampleCollections(700);

    // Save to file
    await saveCollectionsToFile(collections, "./collections.json");

    console.log("✅ Generated collections.json with 700 sample collections");
    console.log("📁 You can now run: npm run bulk-analysis");

    // Show first few collections as preview
    console.log("\n📋 Preview of first 5 collections:");
    collections.slice(0, 5).forEach((collection, index) => {
      console.log(`${index + 1}. ${collection.name} - ${collection.address}`);
    });
  } catch (error) {
    console.error("❌ Error generating collections:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

