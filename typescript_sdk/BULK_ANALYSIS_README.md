# Bulk Collection Analysis

This set of scripts allows you to efficiently analyze multiple collections (up to 700+) to obtain details of all assets from a specific address.

## 🚀 Main Features

- **Batch processing**: Processes collections in groups of 50 to optimize performance
- **Concurrency control**: Limits concurrent requests to avoid overload
- **Rate limiting**: Avoids being blocked by too many requests
- **Error handling**: Continues processing even if some collections fail
- **Real-time progress**: Shows analysis progress
- **Detailed results**: Complete information of each asset found

## 📁 Files

- `bulk-collection-assets.ts` - Main bulk analysis script
- `collections-loader.ts` - Utilities for loading collections from files
- `generate-collections.ts` - Example collections generator
- `get-wallet-assets.ts` - Analysis of all assets in a wallet
- `get-wallet-assets-cli.ts` - CLI version of wallet analysis

## 🛠️ Configuration

### 1. Configure user address

Edit `bulk-collection-assets.ts` and change the `USER_ADDRESS` variable:

```typescript
const USER_ADDRESS = "0xYOUR_ADDRESS_HERE";
```

### 2. Configure performance parameters

You can adjust these values according to your needs:

```typescript
const BATCH_SIZE = 50; // Collections per batch
const TOKEN_BATCH_SIZE = 100; // Tokens per request
const MAX_CONCURRENT_REQUESTS = 10; // Maximum concurrent requests
```

## 📋 Usage

### Option 1: Use example collections

```bash
# Generate 700 example collections
npm run generate-collections

# Run bulk analysis
npm run bulk-analysis
```

### Option 2: Use your own collections

1. Create a `collections.json` file with the format:

```json
[
  {
    "address": "0x1234567890abcdef...",
    "name": "My Collection 1"
  },
  {
    "address": "0xabcdef1234567890...",
    "name": "My Collection 2"
  }
]
```

2. Run the analysis:

```bash
npm run bulk-analysis
```

### Option 3: Use the collections loader directly

```bash
npm run collections-loader
```

### Option 4: Analyze all assets in a wallet

```bash
# Use hardcoded address
npm run wallet-assets

# Specify address as parameter
npm run wallet-assets-cli 0xYOUR_ADDRESS_HERE
```

## 📊 Results

### For Specific Collection Analysis

The script will show:

1. **General summary**:

   - Total collections processed
   - Total assets found
   - Collections with errors

2. **Summary by collection**:

   - Status of each collection (✅ with assets, ⚠️ without assets, ❌ with errors)
   - Number of assets per collection

3. **Asset details**:
   - Token name
   - Token ID
   - Token URI
   - Token properties
   - Digital asset information

### For Complete Wallet Analysis

The script will show:

1. **General summary**:

   - Total assets in wallet
   - Total unique collections
   - Analysis time

2. **Summary by collection**:

   - Collections sorted by asset count
   - Number of assets per collection

3. **Asset details**:
   - Token name
   - Collection it belongs to
   - Token ID and amount
   - Token URI
   - Detailed properties (if enabled)

## ⚡ Performance Optimizations

### Rate Limiting

- Automatically controls the number of concurrent requests
- Avoids overloading the Aptos API

### Batch Processing

- Processes collections in groups of 50
- Shows real-time progress
- Allows easy interruption and resumption

### Efficient Pagination

- Gets tokens in batches of 100
- Automatically handles complete pagination

## 🔧 Customization

### Change collections file

Edit `bulk-collection-assets.ts`:

```typescript
const COLLECTIONS_FILE = "./your-collections-file.json";
```

### Modify output format

You can uncomment these lines in `main()` to save results:

```typescript
// await fs.writeFile('./analysis-results.json', JSON.stringify(results, null, 2));
```

### Adjust performance parameters

For slower connections, reduce concurrency:

```typescript
const MAX_CONCURRENT_REQUESTS = 5; // Fewer concurrent requests
const BATCH_SIZE = 25; // Smaller batches
```

### Configure wallet analysis

In `get-wallet-assets.ts` you can adjust:

```typescript
const SHOW_DETAILED_INFO = true; // Set to false for faster execution
const BATCH_SIZE = 100; // Tokens per request
const MAX_CONCURRENT_REQUESTS = 10; // Concurrent requests
```

## 🐛 Troubleshooting

### Rate limiting error

- Reduce `MAX_CONCURRENT_REQUESTS`
- Increase time between requests

### Insufficient memory

- Reduce `BATCH_SIZE`
- Process fewer collections at a time

### Timeouts

- Check your internet connection
- Consider using a closer server

## 📈 Monitoring

The script shows:

- Real-time progress
- Elapsed time
- Processed collections
- Errors found

## 🔄 Resume Processing

If you need to interrupt and resume:

1. Save partial results
2. Modify the collections list to exclude already processed ones
3. Run the script again

## 📝 Example Output

```
🚀 Starting bulk collection analysis...
🌐 Network: mainnet
👤 User Address: 0xf0c680055d459b5f260672e03e0482077d1f61daa664d6369b0a00b368b309f3
📚 Total Collections: 700
⚙️  Batch Size: 50
🔄 Max Concurrent Requests: 10

📦 Processing batch 1/14 (50 collections)
🔍 Processing collection: Sample Collection 1
   ⚠️  No tokens found in collection: Sample Collection 1
   ✅ Completed collection: Sample Collection 1

📈 Progress: 50/700 (7.1%) - Elapsed: 45.2s

==========================================
📊 BULK COLLECTION ANALYSIS RESULTS
==========================================
👤 User Address: 0xf0c680055d459b5f260672e03e0482077d1f61daa664d6369b0a00b368b309f3
📚 Collections Processed: 700
🎯 Total Assets Found: 15
✅ Collections with Assets: 3
❌ Collections with Errors: 0
```
