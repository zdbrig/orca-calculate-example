import { BN } from "@project-serum/anchor";
import { getTokenAmountsFromLiquidity } from "./getTokenAmountsFromLiquidity";
import { PublicKey } from "@solana/web3.js";
import { getPositionsBywalletOrca } from "./getPositionsBywallet";

import * as dotenv from 'dotenv';
import { PriceMath } from "@orca-so/whirlpools-sdk";
import { DecimalUtil } from "@orca-so/common-sdk";
dotenv.config();


// Function to calculate position
async function calculatePosition(liquidity: any, futurePrice: number, lowerPriceBound: number, upperPriceBound: number) {
    try {
        let pc = PriceMath.priceToSqrtPriceX64(DecimalUtil.fromNumber(futurePrice), liquidity.decimalA, liquidity.decimalB);
        let pl = PriceMath.priceToSqrtPriceX64(DecimalUtil.fromNumber(lowerPriceBound), liquidity.decimalA, liquidity.decimalB);
        let pu = PriceMath.priceToSqrtPriceX64(DecimalUtil.fromNumber(upperPriceBound), liquidity.decimalA, liquidity.decimalB);

        let res = await getTokenAmountsFromLiquidity(liquidity.liquidity, pc, pl, pu, false);

        let tokenA = res.tokenA.toNumber() / (10 ** parseFloat(liquidity.decimalA));
        let tokenB = res.tokenB.toNumber() / (10 ** parseFloat(liquidity.decimalB));

        return { tokenA, tokenB };
    } catch (error) {
        console.error("Error in calculatePosition:", error);
        throw error; // Rethrow the error for handling upstream
    }
}


async function adjustPriceWithThreshold(liquidity: any, futurePrice:number, threshold: number, increase: boolean) {
    let currentPrice = futurePrice;
    let incrementFactor = increase ? 0.0001 : -0.0001; // Increase or decrease the price
    let maxIterations = 10000000; // To prevent infinite loops, you can set a max iteration count
    let tokenA = 0; // Declare tokenA outside the loop

    for (let i = 0; i < maxIterations; i++) {
        currentPrice += incrementFactor;
        let positionResult = await calculatePosition(liquidity, currentPrice, liquidity.lower, liquidity.upper);
        tokenA = positionResult.tokenA;
        let difference = Math.abs(parseFloat(liquidity.amountA) - tokenA);
        if (difference >= threshold) {
            break;
        }
    }

    return { finalPrice: currentPrice, finalTokenA: tokenA };
}

async function calculatePriceAdjustments(liquidity: any, futurePrice: number) {
    //@ts-ignore
    let lowerPriceBound = 65; //liquidity.lower;
    //@ts-ignore
    let upperPriceBound = 75; // liquidity.upper;

    liquidity.upper = upperPriceBound;

    liquidity.lower  = lowerPriceBound;
    console.log("price = ", futurePrice);
    //@ts-ignore

    let { tokenA, tokenB } = await calculatePosition(liquidity, futurePrice, lowerPriceBound, upperPriceBound);
    console.log(`Solana position: ${tokenA}, USDC position: ${tokenB}`);
    liquidity.amountA = tokenA;
    liquidity.amountB = tokenB;

    let threshold = 1; // Define your threshold

    console.log(`liquidity is now ${JSON.stringify(liquidity)}`);
    // Example of increasing the price
    let { finalPrice: increasedPrice, finalTokenA: increasedTokenA } = await adjustPriceWithThreshold(liquidity,futurePrice ,threshold, true);
    console.log(`Increased price: ${increasedPrice}, Increased Token A position: ${increasedTokenA}`);

    // Example of decreasing the price
    let { finalPrice: decreasedPrice, finalTokenA: decreasedTokenA } = await adjustPriceWithThreshold(liquidity,futurePrice ,threshold, false);
    console.log(`Decreased price: ${decreasedPrice}, Decreased Token A position: ${decreasedTokenA}`);

    return { increasedPrice, decreasedPrice };
}


async function main() {
    try {


        const wallet = new PublicKey(process.env.PUBKEY);
        const liquidityData = await getPositionsBywalletOrca(wallet);
        console.log(liquidityData)

        
        let liquidity = liquidityData[0];


         liquidity.liquidity  *= 100;
        //@ts-ignore
        
        let prices = await calculatePriceAdjustments(liquidity , 67);

        console.log(` prices are : ${JSON.stringify(prices)}`);
    } catch (error) {
        console.error("Error:", error);
    }
}

main();
