import {
  Account,
  Aptos,
  AptosConfig,
  Ed25519PrivateKey,
  Network,
} from "@aptos-labs/ts-sdk";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Get network from environment variable, default to TESTNET if not specified
const networkEnv = process.env.NETWORK?.toUpperCase() || "TESTNET";
const network = Network[networkEnv as keyof typeof Network] || Network.TESTNET;

// Create Aptos client configuration
const config = new AptosConfig({ network });
const aptos = new Aptos(config);

// Get private key from environment
const privateKeyString = process.env.APTOS_ACCOUNT_PRIVATE_KEY || "";

// Create account from private key
const privateKey = new Ed25519PrivateKey(privateKeyString);
const account = Account.fromPrivateKey({ privateKey });

// Export the configured instances
export { aptos, account, network };

// Export a function to get account address
export const getAccountAddress = () => account.accountAddress.toString();

// Export a function to get network name
export const getNetworkName = () => networkEnv;

// Export a function to check if account is configured
export const isAccountConfigured = () => privateKeyString.length > 0;
