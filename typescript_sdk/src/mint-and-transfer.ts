import { AccountAddress } from "@aptos-labs/ts-sdk";
import {
  aptos,
  account,
  getAccountAddress,
  getNetworkName,
  isAccountConfigured,
} from "./config/aptos-client";

// Check if account is configured
if (!isAccountConfigured()) {
  console.error(
    "Error: APTOS_ACCOUNT_PRIVATE_KEY not configured in environment variables"
  );
  process.exit(1);
}
console.log("Network:", getNetworkName());
console.log("Your address:", getAccountAddress());

interface MintResult {
  tokenId: string;
  txHash: string;
}

interface TransferResult {
  txHash: string;
}

async function mintNFT(
  collectionName: string,
  name: string,
  description: string,
  uri: string
): Promise<MintResult> {
  let committedTxn;
  try {
    console.log(`Minting NFT: ${name} in collection: ${collectionName}`);

    const transaction = await aptos.mintDigitalAssetTransaction({
      creator: account,
      collection: collectionName,
      description,
      name,
      uri,
    });

    committedTxn = await aptos.signAndSubmitTransaction({
      signer: account,
      transaction,
    });

    console.log("Mint transaction hash:", committedTxn.hash);

    const txnDetails = await aptos.waitForTransaction({
      transactionHash: committedTxn.hash,
    });

    // Type guard to ensure it has events
    const hasEvents = (tx: any): tx is { events: any[] } =>
      Array.isArray(tx.events);

    let tokenId: string | undefined = undefined;
    if (hasEvents(txnDetails)) {
      const mintEvent = txnDetails.events.find((e: any) =>
        e.type.includes("Mint")
      );
      tokenId = mintEvent?.data?.token;
      if (!tokenId) {
        console.warn("Could not find token ID in transaction events");
        throw new Error("Could not find token ID in transaction events");
      }
    } else {
      console.warn("Transaction does not contain events");
      throw new Error("Transaction does not contain events");
    }

    console.log("NFT minted successfully! Token ID:", tokenId);

    return {
      tokenId,
      txHash: committedTxn.hash,
    };
  } catch (error) {
    console.error(
      `Error minting NFT: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    // If we have the transaction hash, include it in the error
    if (committedTxn?.hash && error instanceof Error) {
      (error as any).txHash = committedTxn.hash;
    }
    throw error;
  }
}

async function transferNFT(
  tokenId: string,
  toAddress: string
): Promise<TransferResult> {
  let committedTxn;
  try {
    console.log(`Transferring NFT ${tokenId} to ${toAddress}`);

    const transaction = await aptos.transferDigitalAssetTransaction({
      sender: account,
      digitalAssetAddress: tokenId,
      recipient: AccountAddress.from(toAddress),
    });

    committedTxn = await aptos.signAndSubmitTransaction({
      signer: account,
      transaction,
    });

    console.log("Transfer transaction hash:", committedTxn.hash);

    await aptos.waitForTransaction({
      transactionHash: committedTxn.hash,
    });

    console.log(
      `NFT transferred successfully. Transaction hash: ${committedTxn.hash}`
    );

    return {
      txHash: committedTxn.hash,
    };
  } catch (error) {
    console.error(
      `Error transferring NFT: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    // If we have the transaction hash, include it in the error
    if (committedTxn?.hash && error instanceof Error) {
      (error as any).txHash = committedTxn.hash;
    }
    throw error;
  }
}

async function mintAndTransfer(
  collectionName: string,
  tokenName: string,
  description: string,
  uri: string,
  recipient: string
) {
  try {
    console.log("Starting mint and transfer process...");

    // Step 1: Mint the NFT
    console.log("Step 1: Minting NFT...");
    const mintResult = await mintNFT(
      collectionName,
      tokenName,
      description,
      uri
    );

    console.log("Mint completed:", mintResult);

    // Step 2: Transfer the NFT
    console.log("Step 2: Transferring NFT...");
    const transferResult = await transferNFT(mintResult.tokenId, recipient);

    console.log("Transfer completed:", transferResult);

    return {
      success: true,
      mintResult,
      transferResult,
      tokenId: mintResult.tokenId,
      creatorAddress: account.accountAddress.toString(),
      recipientAddress: recipient,
    };
  } catch (error) {
    console.error("Error in mintAndTransfer:", error);
    throw error;
  }
}

async function main() {
  const collectionName = "UFCPACKS";
  const description = "Token description";
  const tokenName = "My Token #1";
  const uri = "ipfs://your-uri-here";
  const recipient =
    "0x39f6714f6307d07aaf510f4a0edd87fe6ffd741d60429c9517efde6f9cd92d27"; // Replace with recipient address

  try {
    const result = await mintAndTransfer(
      collectionName,
      tokenName,
      description,
      uri,
      recipient
    );
    console.log("Final result:", result);
  } catch (error) {
    console.error("Error in main:", error);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
