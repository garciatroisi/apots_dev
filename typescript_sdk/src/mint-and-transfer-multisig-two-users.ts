import { MoveString } from "@aptos-labs/ts-sdk";
import {
  aptos,
  account,
  payerAccount,
  getAccountAddress,
  isPayerAccountConfigured,
  isAccountConfigured,
  getPayerAccountAddress,
  isUserAccountConfigured,
  userAccount,
} from "./config/aptos-client";

// Check if account is configured
if (!isAccountConfigured()) {
  console.error(
    "Error: APTOS_ACCOUNT_PRIVATE_KEY not configured in environment variables"
  );
  process.exit(1);
}
if (!isPayerAccountConfigured()) {
  console.error(
    "Error: APTOS_PAYER_ACCOUNT_PRIVATE_KEY not configured in environment variables"
  );
  console.log(
    "This example requires a separate payer account to be configured."
  );
  console.log("Please set APTOS_PAYER_ACCOUNT_PRIVATE_KEY in your .env file");
  process.exit(1);
}

// Check if user account is configured
if (!isUserAccountConfigured()) {
  console.error(
    "Error: APTOS_USER_ACCOUNT_PRIVATE_KEY not configured in environment variables"
  );
  console.log("This example requires a user account to be configured.");
  process.exit(1);
}

console.log("Payer address:", getPayerAccountAddress());
console.log("Using separate payer account for transactions");

interface MultiSigMintAndTransferResult {
  success: boolean;
  momentId?: string;
  txHash?: string;
  txHashUser?: string;
  error?: string;
  message?: string;
  payerAddress?: string;
  userAddress?: string;
  creatorAddress?: string;
  recipientAddress?: string;
  collectionName?: string;
  momentName?: string;
}

async function createMultiSigMintAndTransfer(
  payerAccount: any,
  creatorAccount: any,
  recipientAddress: string,
  collectionName: string,
  description: string,
  momentName: string,
  uri: string
): Promise<MultiSigMintAndTransferResult> {
  try {
    console.log("Creating multi-signature mint and transfer transaction...");
    console.log("Payer:", payerAccount.accountAddress.toString());
    console.log("Creator:", creatorAccount.accountAddress.toString());
    console.log("User:", userAccount!.accountAddress.toString());
    console.log("Recipient:", recipientAddress);

    console.log("Multi-signature public key created");
    console.log("Threshold: 2 signatures required");

    const transaction = await aptos.transaction.build.multiAgent({
      sender: payerAccount.accountAddress, // payer is the sender
      secondarySignerAddresses: [account.accountAddress], // creator is secondary signer
      data: {
        function: `${getAccountAddress()}::moments_manager::mint_and_transfer_moment`,
        functionArguments: [
          new MoveString(collectionName),
          new MoveString(description),
          new MoveString(momentName),
          new MoveString(uri),
          [],
          [],
          [],
          recipientAddress,
        ],
      },
    });

    const transactionUser = await aptos.transaction.build.multiAgent({
      sender: userAccount!.accountAddress, // payer is the sender
      secondarySignerAddresses: [account.accountAddress], // creator is secondary signer
      data: {
        function: `${getAccountAddress()}::moments_manager::mint_and_transfer_moment`,
        functionArguments: [
          new MoveString(collectionName),
          new MoveString(description),
          new MoveString(momentName),
          new MoveString(uri),
          [],
          [],
          [],
          recipientAddress,
        ],
      },
    });
    console.log("Transaction created, ready for signatures");

    // Step 4: Sign once for each agent
    console.log("Signing transaction with payer account...");
    const payerSenderAuthenticator = aptos.transaction.sign({
      signer: payerAccount,
      transaction,
    });

    console.log("Signing transaction with creator account...");
    const creatorSenderAuthenticator = aptos.transaction.sign({
      signer: account,
      transaction,
    });

    console.log("Signing transaction with user account...");
    const userSenderAuthenticator = aptos.transaction.sign({
      signer: userAccount!,
      transaction: transactionUser,
    });

    console.log("Signing transaction with creator account...");
    const creatorSenderAuthenticator2 = aptos.transaction.sign({
      signer: account,
      transaction: transactionUser,
    });

    console.log("Submitting multi-agent transaction...");
    // submit first the creator signer after
    const committedUserTransaction = await aptos.transaction.submit.multiAgent({
      transaction: transactionUser,
      senderAuthenticator: userSenderAuthenticator,
      additionalSignersAuthenticators: [creatorSenderAuthenticator2],
    });

    // submit second the creator signer before
    const committedTransaction = await aptos.transaction.submit.multiAgent({
      transaction,
      senderAuthenticator: payerSenderAuthenticator,
      additionalSignersAuthenticators: [creatorSenderAuthenticator],
    });

    console.log("Transactions submitted successfully");
    console.log(
      "committedUserTransaction hash:",
      committedUserTransaction.hash
    );
    console.log("committedTransaction hash:", committedTransaction.hash);

    // Step 6: Wait for the transaction to resolve

    console.log("Waiting for transaction to be executed...");
    const executedTransactionPayer = await aptos.waitForTransaction({
      transactionHash: committedTransaction.hash,
    });
    const executedTransactionUser = await aptos.waitForTransaction({
      transactionHash: committedUserTransaction.hash,
    });

    console.log("Transaction executed successfully");
    console.log("Transaction User status:", executedTransactionUser.success);
    console.log("Transaction Payer status:", executedTransactionPayer.success);

    return {
      success: true,
      txHash: committedTransaction.hash,
      txHashUser: committedUserTransaction.hash,
      message: "Multi-signature transactions executed successfully",
      payerAddress: payerAccount.accountAddress.toString(),
      userAddress: userAccount!.accountAddress.toString(),
      creatorAddress: creatorAccount.accountAddress.toString(),
      recipientAddress,
      collectionName,
      momentName,
    };
  } catch (error) {
    console.error("Error in createMultiSigMintAndTransfer:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  const collectionName = "UFCPACKS";
  const description = "UFC Champion Moment";
  const momentName = "Conor McGregor #1";
  const uri = "ipfs://your-uri-here";

  // In a real scenario, you would have two different accounts
  const payerUserAccount = payerAccount; // This would be the payer account
  const creatorAccount = account; // This would be the creator account (different private key)
  const recipientAddress =
    "0x39f6714f6307d07aaf510f4a0edd87fe6ffd741d60429c9517efde6f9cd92d27";

  try {
    const result = await createMultiSigMintAndTransfer(
      payerUserAccount,
      creatorAccount,
      recipientAddress,
      collectionName,
      description,
      momentName,
      uri
    );
    console.log("Result:", result);
  } catch (error) {
    console.error("Error in main:", error);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
