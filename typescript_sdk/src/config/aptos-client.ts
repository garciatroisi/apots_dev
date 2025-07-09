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
const config = new AptosConfig({
  network,
  clientConfig: {
    ...(process.env.APTOS_API_KEY
      ? { API_KEY: process.env.APTOS_API_KEY }
      : {}),
  },
});
const aptos = new Aptos(config);

// Get private key from environment for main account (creator)
const privateKeyString = process.env.APTOS_ACCOUNT_PRIVATE_KEY || "";

// Create main account from private key
const privateKey = new Ed25519PrivateKey(privateKeyString);
const account = Account.fromPrivateKey({ privateKey });

// Get payer private key from environment
const payerPrivateKeyString = process.env.APTOS_PAYER_ACCOUNT_PRIVATE_KEY || "";

// Create payer account from private key (if provided)
let payerAccount: Account | null = null;
if (payerPrivateKeyString.length > 0) {
  const payerPrivateKey = new Ed25519PrivateKey(payerPrivateKeyString);
  payerAccount = Account.fromPrivateKey({ privateKey: payerPrivateKey });
}

// Get user private key from environment
const userPrivateKeyString = process.env.APTOS_USER_ACCOUNT_PRIVATE_KEY || "";

// Create user account from private key (if provided)
let userAccount: Account | null = null;
if (userPrivateKeyString.length > 0) {
  const userPrivateKey = new Ed25519PrivateKey(userPrivateKeyString);
  userAccount = Account.fromPrivateKey({ privateKey: userPrivateKey });
}

// Export the configured instances
export { aptos, account, network, payerAccount, userAccount };

// Export a function to get account address
export const getAccountAddress = () => account.accountAddress.toString();

// Export a function to get payer account address
export const getPayerAccountAddress = () => {
  if (payerAccount) {
    return payerAccount.accountAddress.toString();
  }
  return null;
};

// Export a function to get user account address
export const getUserAccountAddress = () => {
  if (userAccount) {
    return userAccount.accountAddress.toString();
  }
  return null;
};

// Export a function to get network name
export const getNetworkName = () => networkEnv;

// Export a function to check if account is configured
export const isAccountConfigured = () => privateKeyString.length > 0;

// Export a function to check if payer account is configured
export const isPayerAccountConfigured = () => payerPrivateKeyString.length > 0;

// Export a function to check if user account is configured
export const isUserAccountConfigured = () => userPrivateKeyString.length > 0;

// Export a function to get the appropriate account for transactions
// If payer account is configured, use it; otherwise use the main account
export const getTransactionAccount = () => {
  return payerAccount || account;
};

// Export a function to get all configured accounts
export const getAllAccounts = () => {
  return {
    creator: account,
    payer: payerAccount,
    user: userAccount,
  };
};
