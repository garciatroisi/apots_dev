import {
  aptos,
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

async function getAccountBalance() {
  try {
    console.log("Getting account balance...");

    const balance = await aptos.getAccountAPTAmount({
      accountAddress: getAccountAddress(),
    });

    // Convert from octas to APT (divide by 10^8)
    const aptBalance = Number(balance) / 100000000;

    console.log("Balance in octas:", balance);
    console.log("Balance in APT:", aptBalance);

    return {
      data: {
        coin: {
          value: aptBalance.toString(),
        },
      },
    };
  } catch (error) {
    console.error("Error getting account balance:", error);
    return {
      data: {
        coin: {
          value: "0",
        },
      },
    };
  }
}

async function main() {
  const result = await getAccountBalance();
  console.log("Final result:", result);
}

main().catch(console.error);
