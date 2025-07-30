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

async function updateTokenName(
  creator: Account,
  digitalAssetAddress: string,
  newName: string
) {
  try {
    console.log(`Updating name for token at address ${digitalAssetAddress}...`);

    const transaction = await aptos.setDigitalAssetNameTransaction({
      creator,
      name: newName,
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
      `NFT name updated successfully. Transaction hash: ${committedTxn.hash}`
    );
  } catch (error) {
    console.error("Error updating token name:", error);
    throw error;
  }
}

async function main() {
  // Replace these values with the correct ones
  const digitalAssetAddress =
    "0xaa6a046cab454067ced50a4abc7a1d036e7e9e41cc375d11dce11d27846768ee"; // Address of the token to update
  const newName = "TONGA | UFC CHAMPION #1"; // New name to assign

  await updateTokenName(account, digitalAssetAddress, newName);
}

main().catch((error) => {
  console.error("Main error:", error);
  process.exit(1);
});
