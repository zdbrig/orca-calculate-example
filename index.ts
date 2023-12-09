import { BN } from "@project-serum/anchor";
import { getTokenAmountsFromLiquidity } from "./getTokenAmountsFromLiquidity";
import { PublicKey } from "@solana/web3.js";
import { getPositionsBywalletOrca } from "./getPositionsBywallet";

import * as dotenv from 'dotenv';
import { PriceMath } from "@orca-so/whirlpools-sdk";
import { DecimalUtil } from "@orca-so/common-sdk";
dotenv.config();



// Example parameters - replace these with actual values
//const liquidity = new BN('5042021520');
//const currentSqrtPrice = new BN('73550000');
//const lowerSqrtPrice = new BN('72400000');
//const upperSqrtPrice = new BN('75780000');
//const roundUp = true; // or false
/*
function findPriceChangeForOneSolana(liquidity, currentSqrtPrice, lowerSqrtPrice, upperSqrtPrice, increase, tolerance, maxIterations) {
    let iteration = 0;
    let sqrtPriceShift = 0;
    let currentSolana = 0;
    let initialSolanaPosition = getTokenAmountsFromLiquidity(liquidity, currentSqrtPrice, lowerSqrtPrice, upperSqrtPrice, false).tokenA; // Assuming Solana is tokenA

    while (iteration < maxIterations) {
        sqrtPriceShift = increase ? sqrtPriceShift + smallIncrement : sqrtPriceShift - smallIncrement; // Adjust the increment as needed
        let newSolanaPosition = getTokenAmountsFromLiquidity(liquidity, currentSqrtPrice + sqrtPriceShift, lowerSqrtPrice, upperSqrtPrice, false).tokenA;

        currentSolana = newSolanaPosition - initialSolanaPosition;
        if (Math.abs(currentSolana - 1) < tolerance) {
            break;
        }

        iteration++;
    }

    return currentSqrtPrice + sqrtPriceShift;
}
*/
//let priceChange = findPriceChangeForOneSolana(liquidity, currentSqrtPrice, lowerSqrtPrice, upperSqrtPrice, true /* increase */, 0.01 /* tolerance */, 100 /* max iterations */);

//console.log(priceChange);

async function main() {
    try {


        const wallet = new PublicKey("");
        const liquidityData = await getPositionsBywalletOrca(wallet);
        console.log(liquidityData)


      /* const result = await getTokenAmountsFromLiquidity(
            liquidity, 
            currentSqrtPrice, 
            lowerSqrtPrice, 
            upperSqrtPrice, 
            roundUp
        );*/
        
        let liquidity = liquidityData[0];

        //@ts-ignore
        let lowerPriceBound = liquidity.lower;
        console.log(" lower = " + lowerPriceBound)
        //@ts-ignore
        let upperPriceBound = liquidity.upper;
        //@ts-ignore
        let futurePrice =  liquidity.whirlpoolPrice * 1.01;
        console.log("future = " ,  futurePrice);
        //@ts-ignore
        let pc = PriceMath.priceToSqrtPriceX64(DecimalUtil.fromNumber(futurePrice), liquidity.decimalA, liquidity.decimalB)
            //console.log(pc)
            //@ts-ignore
            let pl = PriceMath.priceToSqrtPriceX64(DecimalUtil.fromNumber(lowerPriceBound), liquidity.decimalA, liquidity.decimalB)
            //@ts-ignore
            let pu = PriceMath.priceToSqrtPriceX64(DecimalUtil.fromNumber(upperPriceBound), liquidity.decimalA, liquidity.decimalB)
           //@ts-ignore
            await getTokenAmountsFromLiquidity(liquidity.liquidity, pc, pl, pu, false);

    } catch (error) {
        console.error("Error:", error);
    }
}

main();
