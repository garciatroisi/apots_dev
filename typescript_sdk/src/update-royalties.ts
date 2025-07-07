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

async function getRoyaltyData(collectionAddress: string) {
  try {
    const resource = await aptos.getAccountResource({
      accountAddress: collectionAddress,
      resourceType: "0x4::royalty::Royalty",
    });
    console.log("Royalty data:", {
      numerator: resource.numerator,
      denominator: resource.denominator,
      payee_address: resource.payee_address,
    });
    return resource;
  } catch (error) {
    console.error("Error getting royalty data:", error);
    throw error;
  }
}

async function updateRoyaltyAddress(
  creator: Account,
  collectionAddress: string,
  newPayeeAddress: string,
  royaltyNumerator: number,
  royaltyDenominator: number
) {
  try {
    console.log(
      `Updating royalty address for collection at ${collectionAddress}...`
    );

    // Check data before update
    console.log("Royalty data before update:");
    const royaltyData = await getRoyaltyData(collectionAddress);

    const txn = await aptos.transaction.build.simple({
      sender: creator.accountAddress,
      data: {
        function: "0x4::aptos_token::set_collection_royalties_call",
        typeArguments: ["0x4::aptos_token::AptosCollection"],
        functionArguments: [
          collectionAddress,
          royaltyNumerator,
          royaltyDenominator,
          newPayeeAddress,
        ],
      },
    });

    const committedTxn = await aptos.signAndSubmitTransaction({
      signer: creator,
      transaction: txn,
    });

    await aptos.waitForTransaction({
      transactionHash: committedTxn.hash,
    });

    console.log(
      `Royalty address updated successfully. Transaction hash: ${committedTxn.hash}`
    );

    // Check data after update
    console.log("\nRoyalty data after update:");
    const updatedRoyaltyData = await getRoyaltyData(collectionAddress);

    // Verify changes were applied correctly
    console.log("Royalty data comparison:", {
      before: {
        numerator: royaltyData.numerator,
        denominator: royaltyData.denominator,
        payee_address: royaltyData.payee_address,
      },
      after: {
        numerator: updatedRoyaltyData.numerator,
        denominator: updatedRoyaltyData.denominator,
        payee_address: updatedRoyaltyData.payee_address,
      },
    });
  } catch (error) {
    console.error("Error updating royalty address:", error);
    throw error;
  }
}

async function main() {
  // Replace these values with the correct ones
  const collectionAddress =
    "0x550158f511c39e3d69d41aa3cdc1d6deb5eb80b2d826e7a9020d8f8b0d125ce0"; // 'POLYANA VIANA | UFC FIGHT NIGHT NOV 05, 2022 | KO/TKO'
  const newPayeeAddress =
    "0x39f6714f6307d07aaf510f4a0edd87fe6ffd741d60429c9517efde6f9cd92d27"; // diegoTest
  const royaltyNumerator = 15; // 15%
  const royaltyDenominator = 100; // Standard denominator for percentages

  await updateRoyaltyAddress(
    account,
    collectionAddress,
    newPayeeAddress,
    royaltyNumerator,
    royaltyDenominator
  );
}

main().catch((error) => {
  console.error("Main error:", error);
  process.exit(1);
});
