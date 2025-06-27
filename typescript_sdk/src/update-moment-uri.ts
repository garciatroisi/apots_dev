import { Account } from "@aptos-labs/ts-sdk";
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

async function updateTokenUri(
  creator: Account,
  digitalAssetAddress: string,
  newUri: string
) {
  try {
    console.log(`Updating URI for token at address ${digitalAssetAddress}...`);

    const transaction = await aptos.setDigitalAssetURITransaction({
      creator,
      uri: newUri,
      digitalAssetAddress,
    });

    const committedTxn = await aptos.signAndSubmitTransaction({
      signer: creator,
      transaction,
    });

    await aptos.waitForTransaction({
      transactionHash: committedTxn.hash,
    });

    console.log(
      `NFT uri updated successfully. Transaction hash: ${committedTxn.hash}`
    );
  } catch (error) {
    console.error("Error updating token URI:", error);
    throw error;
  }
}

async function main() {
  // Replace these values with the correct ones
  const digitalAssetAddress =
    "0xa2792c175eb6f5fcaab14015496c79c0f8eb71da3ac4f01afd1522e009e460ff"; // Address of the token to update
  const newUri =
    "ipfs://bafkreieuw2ho5y2sdsz3s57vzyayqsqdv7tarklmwqaqhhfek3ls5ljvuu"; // New URI to assign

  await updateTokenUri(account, digitalAssetAddress, newUri);
}

main().catch((error) => {
  console.error("Main error:", error);
  process.exit(1);
});
