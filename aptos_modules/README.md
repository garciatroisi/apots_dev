# Aptos Modules

This directory contains Move smart contracts and modules for the Aptos blockchain.

## Structure

- `sources/` - Move source files
- `tests/` - Move test files
- `Move.toml` - Move package configuration

## Development

To develop Move modules:

1. Install the Aptos CLI
2. Initialize a new Move package: `aptos move init --package-name <package_name>`
3. Write your Move modules in the `sources/` directory
4. Test your modules: `aptos move test`
5. Compile: `aptos move compile`
6. Deploy: `aptos move publish`

## Scripts

Move scripts are entry points that can be executed on the blockchain. They are useful for:

- One-time operations
- Complex transactions
- Batch operations
- Administrative tasks

### Creating Scripts

Scripts should be placed in the `sources/` directory with a `.move` extension.

### Running Scripts

After compiling your package, you can run scripts using:

```bash
# Run a compiled script
aptos move run-script --compiled-script-path build/<package_name>/bytecode_scripts/<script_name>.mv --profile devnet

# Example
aptos move run-script --compiled-script-path build/ufc-packs/bytecode_scripts/main.mv --profile devnet
```

### Script Parameters

You can pass parameters to your scripts:

```bash
aptos move run-script --compiled-script-path build/<package_name>/bytecode_scripts/<script_name>.mv --args <arg1> <arg2> --profile devnet
```

### Common Script Use Cases

- Initializing resources
- Setting up accounts
- Batch transfers
- Administrative operations
- Complex business logic execution
