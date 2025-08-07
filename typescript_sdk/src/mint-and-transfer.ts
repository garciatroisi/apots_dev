// import { AccountAddress } from "@aptos-labs/ts-sdk";
import {
  aptos,
  account,
  getAccountAddress,
  getNetworkName,
  isAccountConfigured,
  // getUserAccountAddress,
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

// interface TransferResult {
//   txHash: string;
// }

// interface PropertyResult {
//   txHash: string;
// }

// async function addTokenProperty(
//   digitalAssetAddress: string,
//   propertyKey: string,
//   propertyValue: string,
//   propertyType:
//     | "BOOLEAN"
//     | "U8"
//     | "U16"
//     | "U32"
//     | "U64"
//     | "U128"
//     | "U256"
//     | "ADDRESS"
//     | "STRING"
//     | "ARRAY" = "STRING"
// ): Promise<PropertyResult> {
//   let committedTxn;
//   try {
//     console.log(
//       `Adding property "${propertyKey}" with value "${propertyValue}" to token at address ${digitalAssetAddress}...`
//     );

//     const transaction = await aptos.addDigitalAssetPropertyTransaction({
//       creator: account,
//       digitalAssetAddress,
//       propertyKey,
//       propertyValue,
//       propertyType,
//     });

//     committedTxn = await aptos.signAndSubmitTransaction({
//       signer: account,
//       transaction,
//     });

//     await aptos.waitForTransaction({
//       transactionHash: committedTxn.hash,
//     });

//     console.log(
//       `Token property "${propertyKey}" added successfully. Transaction hash: ${committedTxn.hash}`
//     );

//     return {
//       txHash: committedTxn.hash,
//     };
//   } catch (error) {
//     console.error(
//       `Error adding token property: ${
//         error instanceof Error ? error.message : String(error)
//       }`
//     );
//     // If we have the transaction hash, include it in the error
//     if (committedTxn?.hash && error instanceof Error) {
//       (error as any).txHash = committedTxn.hash;
//     }
//     throw error;
//   }
// }

async function mintNFT(
  collectionName: string,
  name: string,
  description: string,
  uri: string,
  properties?: {
    [key: string]: {
      value: string;
      type?:
        | "BOOLEAN"
        | "U8"
        | "U16"
        | "U32"
        | "U64"
        | "U128"
        | "U256"
        | "ADDRESS"
        | "STRING"
        | "ARRAY";
    };
  }
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
      propertyKeys: properties ? Object.keys(properties) : [],
      propertyValues: properties
        ? Object.values(properties).map((p) => p.value)
        : [],
      propertyTypes: properties
        ? Object.values(properties).map((p) => p.type || "STRING")
        : [],
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

// async function transferNFT(
//   tokenId: string,
//   toAddress: string
// ): Promise<TransferResult> {
//   let committedTxn;
//   try {
//     console.log(`Transferring NFT ${tokenId} to ${toAddress}`);

//     const transaction = await aptos.transferDigitalAssetTransaction({
//       sender: account,
//       digitalAssetAddress: tokenId,
//       recipient: AccountAddress.from(toAddress),
//     });

//     committedTxn = await aptos.signAndSubmitTransaction({
//       signer: account,
//       transaction,
//     });

//     console.log("Transfer transaction hash:", committedTxn.hash);

//     await aptos.waitForTransaction({
//       transactionHash: committedTxn.hash,
//     });

//     console.log(
//       `NFT transferred successfully. Transaction hash: ${committedTxn.hash}`
//     );

//     return {
//       txHash: committedTxn.hash,
//     };
//   } catch (error) {
//     console.error(
//       `Error transferring NFT: ${
//         error instanceof Error ? error.message : String(error)
//       }`
//     );
//     // If we have the transaction hash, include it in the error
//     if (committedTxn?.hash && error instanceof Error) {
//       (error as any).txHash = committedTxn.hash;
//     }
//     throw error;
//   }
// }

async function mintAndTransfer(
  collectionName: string,
  tokenName: string,
  description: string,
  uri: string,
  recipient: string,
  properties?: {
    [key: string]: {
      value: string;
      type?:
        | "BOOLEAN"
        | "U8"
        | "U16"
        | "U32"
        | "U64"
        | "U128"
        | "U256"
        | "ADDRESS"
        | "STRING"
        | "ARRAY";
    };
  }
) {
  try {
    console.log("Starting mint and transfer process...");

    // Step 1: Mint the NFT with properties
    console.log("Step 1: Minting NFT with properties...");
    const mintResult = await mintNFT(
      collectionName,
      tokenName,
      description,
      uri,
      properties
    );

    console.log("Mint completed:", mintResult);

    // Step 2: Transfer the NFT
    console.log("Step 2: Transferring NFT...");
    // const transferResult = await transferNFT(mintResult.tokenId, recipient);
    const transferResult = "no transfered";

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
  // const collectionName = "UFCPACKS_BURNABLE";
  const collectionName = "TJ DILLASHAW | UFC FIGHT NIGHT JULY 11, 2012";
  const description =
    "Former bantamweight champion, TJ Dillashaw finishes Vaughan Lee via rear naked choke from standing body triangle on his way up the 135lb ranks. This is one of the first fights that Dillashaw mixed his tactical, stance switching kickboxing style with his NCAA wrestling pedigree.";
  const uri =
    "ipfs://bafkreiasv4ztzl3lrhuw7npf5fmgo3i4bu7thjnt6tzkwznlscldsj54uq";
  const tokenName = "TJ DILLASHAW | UFC FIGHT NIGHT JULY 11, 2012 | #581";

  const recipient =
    "0xd49449ebf80e6c4e9fe9753cfc52078a70c699a9c79135388636f1cbdc56b930"; //getUserAccountAddress() || "";

  // Define onchain properties to add
  // const properties = {
  //   "Serial Number": { value: "581", type: "U32" as const },
  // };

  try {
    const result = await mintAndTransfer(
      collectionName,
      tokenName,
      description,
      uri,
      recipient
      // properties
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
