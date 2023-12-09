import { BN } from "@project-serum/anchor";
import { getTokenAmountsFromLiquidity } from "./getTokenAmountsFromLiquidity";

// Example parameters - replace these with actual values
const liquidity = new BN('10');
const currentSqrtPrice = new BN('10');
const lowerSqrtPrice = new BN('5');
const upperSqrtPrice = new BN('20');
const roundUp = true; // or false

async function main() {
    try {
        const result = await getTokenAmountsFromLiquidity(
            liquidity, 
            currentSqrtPrice, 
            lowerSqrtPrice, 
            upperSqrtPrice, 
            roundUp
        );
        console.log("Result:", result);
    } catch (error) {
        console.error("Error:", error);
    }
}

main();
