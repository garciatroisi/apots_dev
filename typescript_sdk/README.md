# TypeScript SDK

This directory contains TypeScript applications using the Aptos SDK.

## Structure

- `src/` - TypeScript source files
- `tests/` - Test files
- `package.json` - Node.js dependencies
- `tsconfig.json` - TypeScript configuration
- `.eslintrc.js` - ESLint configuration

## Environment Configuration

Create a `.env` file in this directory with the following variables:

```bash
# Copy the example file
cp env.example .env

# Edit the .env file with your values
```

### Environment Variables

- `NETWORK`: The Aptos network to use (MAINNET, TESTNET, DEVNET)
- `APTOS_ACCOUNT_PRIVATE_KEY`: Your Aptos account private key (hex format) - Creator account
- `APTOS_PAYER_ACCOUNT_PRIVATE_KEY`: Optional payer account private key (hex format)
- `APTOS_USER_ACCOUNT_PRIVATE_KEY`: Optional user account private key (hex format)
- `RPC_URL`: Optional custom RPC URL

### Account Configuration

The SDK supports using multiple accounts for different purposes:

- **Creator Account** (`APTOS_ACCOUNT_PRIVATE_KEY`): The account that creates/authorizes the mint
- **Payer Account** (`APTOS_PAYER_ACCOUNT_PRIVATE_KEY`): The account that pays for gas fees
- **User Account** (`APTOS_USER_ACCOUNT_PRIVATE_KEY`): Additional account for other operations

If `APTOS_PAYER_ACCOUNT_PRIVATE_KEY` is not configured, the creator account will also pay for gas fees.
If `APTOS_USER_ACCOUNT_PRIVATE_KEY` is not configured, only creator and payer accounts will be available.

## Available Scripts

### Basic Examples

- `get-account-balance.ts` - Check account balance
- `get-collection.ts` - Get collection information
- `mint-and-transfer.ts` - Mint and transfer NFTs
- `mint-with-helper.ts` - Mint using helper functions

### Advanced Examples

- `mint-and-transfer-multisig.ts` - Multi-signature transactionss

## Development

To develop with the Aptos TypeScript SDK:

1. Install dependencies: `npm install`
2. Install Aptos SDK: `npm i @aptos-labs/ts-sdk`
3. Configure environment variables (see above)
4. Write your TypeScript code in the `src/` directory
5. Run tests: `npm test`
6. Build: `npm run build`

## Available Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Run the main script (get-collection.ts)
- `npm run dev` - Run in watch mode for development
- `npm run clean` - Remove compiled files
- `npm run lint` - Check code quality with ESLint
- `npm run lint:fix` - Fix ESLint issues automatically

## TypeScript Configuration

The project uses a modern TypeScript configuration with:

- ES2022 target
- Strict type checking
- Source maps for debugging
- Path aliases (`@/*` for `src/*`)
- ESLint integration

## Common Use Cases

- Interacting with smart contracts
- Creating and managing accounts
- Sending transactions
- Querying blockchain state
- Building dApps
- **Separating creator and payer accounts for gas management**

## Running Scripts

```bash
# Run with default network (TESTNET)
npm run start

# Or set network via environment
NETWORK=MAINNET npm run start

# Development mode with auto-reload
npm run dev

# Run specific examples
npx ts-node src/mint-with-payer-account.ts
npx ts-node src/mint-and-transfer-direct.ts
```

## Payer Account Example

The `mint-with-payer-account.ts` example demonstrates how to:

1. Use a creator account to authorize NFT minting
2. Use a separate payer account to cover gas fees
3. Transfer the minted NFT to a recipient

This is useful for scenarios where:

- You want to separate concerns between content creation and transaction costs
- You're building a platform where one account creates content and another pays for operations
- You need to manage gas costs from a dedicated account
