# Aptos Development Project

This repository contains development projects for the Aptos blockchain, including both Move smart contracts and TypeScript SDK applications.

## Project Structure

```
aptos_dev/
├── aptos_modules/     # Move smart contracts and modules
├── typescript_sdk/    # TypeScript applications using Aptos SDK
└── README.md         # This file
```

## Getting Started

### Move Development

Navigate to the `aptos_modules/` directory to work with Move smart contracts.

**Components:**

- **Modules**: Reusable smart contract code
- **Scripts**: Entry points for executing transactions
- **Tests**: Unit tests for your Move code

### TypeScript Development

Navigate to the `typescript_sdk/` directory to work with TypeScript applications.

## Prerequisites

- Aptos CLI
- Node.js and npm
- TypeScript

## Installation

1. Clone this repository
2. Install Aptos CLI: `curl -fsSL "https://aptos.dev/scripts/install_cli.py" | python3`
3. For TypeScript development: `cd typescript_sdk && npm install`

## Development Workflow

1. Develop Move modules and scripts in `aptos_modules/`
2. Test and deploy smart contracts
3. Run scripts for one-time operations or complex transactions
4. Use TypeScript SDK in `typescript_sdk/` to interact with deployed contracts
5. Build and test your applications

## Move Scripts

Move scripts are essential for:

- Initializing resources on the blockchain
- Executing complex transactions
- Administrative operations
- Batch processing

See `aptos_modules/README.md` for detailed information on creating and running scripts.

## Resources

- [Aptos Documentation](https://aptos.dev/)
- [Move Language](https://move-language.github.io/move/)
- [Aptos TypeScript SDK](https://github.com/aptos-labs/aptos-core/tree/main/ecosystem/typescript/sdk)
