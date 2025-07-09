import { Account } from "@aptos-labs/ts-sdk";
import {
  aptos,
  getAllAccounts,
  getAccountAddress,
  getNetworkName,
  isAccountConfigured,
  isUserAccountConfigured,
  getUserAccountAddress,
} from "./config/aptos-client";

// Check if account is configured
if (!isAccountConfigured()) {
  console.error(
    "Error: APTOS_ACCOUNT_PRIVATE_KEY not configured in environment variables"
  );
  process.exit(1);
}

if (!isUserAccountConfigured()) {
  console.error(
    "Error: APTOS_USER_ACCOUNT_PRIVATE_KEY not configured in environment variables"
  );
  process.exit(1);
}

console.log("Network:", getNetworkName());
console.log("Your address:", getAccountAddress());
if (isUserAccountConfigured()) {
  console.log("User address:", getUserAccountAddress());
}

// Burn address constant
const BURN_ADDRESS =
  "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

interface BurnMomentResult {
  txHash: string;
  momentId: string;
  burned: boolean;
  collection?: string;
  momentName?: string;
}

async function getMomentData(momentId: string) {
  try {
    console.log(`🔍 Getting moment data for: ${momentId}`);

    // Get token data (metadata)
    const tokenData = await aptos.getDigitalAssetData({
      digitalAssetAddress: momentId,
    });

    // Get ownership data
    const ownershipData = await aptos.getCurrentDigitalAssetOwnership({
      digitalAssetAddress: momentId,
    });

    console.log("📊 Token data:", tokenData);
    console.log("👤 Ownership data:", ownershipData);

    return {
      tokenData,
      ownershipData,
    };
  } catch (error) {
    console.error("❌ Error getting moment data:", error);
    throw error;
  }
}

async function burnMomentSimple(
  account: Account,
  momentId: string
): Promise<BurnMomentResult> {
  let committedTxn;
  try {
    console.log(`🔥 Function: burnMomentSimple - Starting execution`);
    console.log(
      `🔥 Burning moment: ${momentId} by transferring to burn address`
    );
    console.log(`👤 Account address: ${account.accountAddress.toString()}`);
    console.log(`🔥 Burn address: ${BURN_ADDRESS}`);

    // Get moment data before burning for verification
    console.log("📋 Moment data before burning:");
    const momentDataBefore = await getMomentData(momentId);

    // Verify ownership
    const currentOwner = momentDataBefore.ownershipData.owner_address;
    const accountAddress = account.accountAddress.toString();

    console.log(`🔍 Current owner: ${currentOwner}`);
    console.log(`🔍 Your address: ${accountAddress}`);

    if (currentOwner !== accountAddress) {
      throw new Error(
        `You don't own this moment. Current owner: ${currentOwner}, Your address: ${accountAddress}`
      );
    }

    console.log("✅ Ownership verified. Proceeding with burn...");
    console.log(`🔧 Building transfer transaction to burn address...`);

    // Simple transfer to burn address
    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: "0x1::object::transfer",
        typeArguments: ["0x4::aptos_token::AptosToken"],
        functionArguments: [momentId, BURN_ADDRESS],
      },
    });

    console.log("📝 Transaction built successfully");
    console.log(`📋 Transaction details:`, {
      function: "0x1::object::transfer",
      momentId,
      recipient: BURN_ADDRESS,
    });

    committedTxn = await aptos.signAndSubmitTransaction({
      signer: account,
      transaction,
    });

    console.log("Burn transaction hash:", committedTxn.hash);

    await aptos.waitForTransaction({
      transactionHash: committedTxn.hash,
    });

    console.log(
      `Moment burned successfully by transferring to burn address. Transaction hash: ${committedTxn.hash}`
    );

    // Verify the moment was actually transferred to burn address
    try {
      const newOwnership = await aptos.getCurrentDigitalAssetOwnership({
        digitalAssetAddress: momentId,
      });

      if (newOwnership.owner_address === BURN_ADDRESS) {
        console.log(
          "✅ Moment successfully burned - now owned by burn address"
        );
        return {
          txHash: committedTxn.hash,
          momentId,
          burned: true,
          collection: momentDataBefore.tokenData.collection_id,
          momentName: momentDataBefore.tokenData.token_name,
        };
      } else {
        console.warn("Warning: Moment not transferred to burn address");
        return {
          txHash: committedTxn.hash,
          momentId,
          burned: false,
          collection: momentDataBefore.tokenData.collection_id,
          momentName: momentDataBefore.tokenData.token_name,
        };
      }
    } catch (error) {
      console.warn("Could not verify burn status:", error);
      return {
        txHash: committedTxn.hash,
        momentId,
        burned: true,
        collection: momentDataBefore.tokenData.collection_id,
        momentName: momentDataBefore.tokenData.token_name,
      };
    }
  } catch (error) {
    console.error(
      `Error burning moment: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    if (committedTxn?.hash && error instanceof Error) {
      (error as any).txHash = committedTxn.hash;
    }
    throw error;
  }
}

async function main() {
  console.log("🚀 Function: main - Starting execution");
  console.log("🔧 Initializing simple burn moment process...");

  // Replace with the moment ID you want to burn
  const momentIdToBurn =
    "0xe61998c439b91e563b6ba37383d24838935b9132a9541b9a59d4a4c6a727751b";

  console.log(`🎯 Target moment ID: ${momentIdToBurn}`);

  try {
    console.log("🔑 Getting user account...");
    let userAccount = getAllAccounts().user;
    console.log(
      `👤 User account retrieved: ${userAccount?.accountAddress.toString()}`
    );

    console.log("🔥 Starting simple moment burn...");
    let result = await burnMomentSimple(userAccount!, momentIdToBurn);
    console.log("✅ Burn result:", result);

    console.log("🎉 Function: main - Completed successfully");
  } catch (error) {
    console.error("💥 Error in main:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
