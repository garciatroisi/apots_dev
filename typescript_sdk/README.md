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
- `MNEMONIC`: Your 12 or 24 word mnemonic phrase
- `RPC_URL`: Optional custom RPC URL

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

## Running Scripts

```bash
# Run with default network (TESTNET)
npm run start

# Or set network via environment
NETWORK=MAINNET npm run start

# Development mode with auto-reload
npm run dev
```
