import { BN } from "@project-serum/anchor";
import { getTokenAmountsFromLiquidity } from "./getTokenAmountsFromLiquidity";
import { PublicKey } from "@solana/web3.js";
import { getFirstWhirlpoolPriceByWallet, getPositionsBywalletOrca } from "./getPositionsBywallet";

import * as dotenv from 'dotenv';
import { PriceMath } from "@orca-so/whirlpools-sdk";
import { DecimalUtil } from "@orca-so/common-sdk";
dotenv.config();


// Function to calculate position
async function calculatePosition(
    futurePrice: number,
    liquidity: any,
    lower: number,
    upper: number,
    decimalA: number,
    decimalB: number) {
    try {
        let pc = PriceMath.priceToSqrtPriceX64(DecimalUtil.fromNumber(futurePrice), decimalA, decimalB);
        let pl = PriceMath.priceToSqrtPriceX64(DecimalUtil.fromNumber(lower), decimalA, decimalB);
        let pu = PriceMath.priceToSqrtPriceX64(DecimalUtil.fromNumber(upper), decimalA, decimalB);

        let res = await getTokenAmountsFromLiquidity(liquidity, pc, pl, pu, false);

        let tokenA = res.tokenA.toNumber() / (10 ** decimalA);
        let tokenB = res.tokenB.toNumber() / (10 ** decimalB);

        return { tokenA, tokenB };
    } catch (error) {
        console.error("Error in calculatePosition:", error);
        throw error; // Rethrow the error for handling upstream
    }
}


async function adjustPriceWithThreshold(
    futurePrice: number,
    threshold: number,
    increase: boolean,
    amountA: number,
    liquidity: any,
    lower: number,
    upper: number,
    decimalA: number,
    decimalB: number
) {
    let currentPrice = futurePrice;
    let incrementFactor = increase ? 0.0001 : -0.0001; // Increase or decrease the price
    let maxIterations = 10000000; // To prevent infinite loops, you can set a max iteration count
    let tokenA = 0; // Declare tokenA outside the loop

    for (let i = 0; i < maxIterations; i++) {
        currentPrice += incrementFactor;
       
        let positionResult = await await calculatePosition(currentPrice, liquidity, lower, upper, decimalA, decimalB);
        tokenA = positionResult.tokenA;
        if  ((currentPrice < 0) || (currentPrice > upper) || (currentPrice < lower) ) {
            break;
        }
        if (!tokenA) {
            break;
        }
        let difference = Math.abs(amountA - tokenA);
        if (difference >= threshold) {
            break;
        }
    }

    return { finalPrice: currentPrice, finalTokenA: tokenA };
}

async function calculatePriceAdjustments(futurePrice: number,
    liquidity: any,
    lower: number,
    upper: number,
    decimalA: number,
    decimalB: number
) {




    let { tokenA, tokenB } = await calculatePosition(futurePrice, liquidity, lower, upper, decimalA, decimalB);


    let threshold = 1; // Define your threshold

    // console.log(`liquidity is now ${JSON.stringify(liquidity)}`);
    // Example of increasing the price
    let { finalPrice: increasedPrice, finalTokenA: increasedTokenA } = await adjustPriceWithThreshold(futurePrice, threshold, true, tokenA, liquidity, lower, upper, decimalA, decimalB);

    // Example of decreasing the price
    let { finalPrice: decreasedPrice, finalTokenA: decreasedTokenA } = await adjustPriceWithThreshold(futurePrice, threshold, false, tokenA, liquidity, lower, upper, decimalA, decimalB);

    return {
        currentPosition: {
            price: futurePrice,
            tokenA,
            tokenB
        },
        upperPosition: {
            price: increasedPrice,
            tokenA: increasedTokenA
        },
        lowerPosition: {
            price: decreasedPrice,
            tokenA: decreasedTokenA
        }
    };
}


async function calcUpperLower(
    price: number,
     liquidity = 110309787400,
     lower = 70,
     upper = 80,
     decimalA = 9,
     decimalB = 6

) {
    try {


        let prices = await calculatePriceAdjustments(price,  liquidity,  lower,  upper,  decimalA,  decimalB);


        console.log(` prices are : ${JSON.stringify(prices, null, 4)}`);
    } catch (error) {
        console.error("Error:", error);
    }
}



calcUpperLower(78);

async function calcUpperLowerByCurrentPrice() {
    let price = await getFirstWhirlpoolPriceByWallet(new PublicKey(process.env.PUBKEY));
    calcUpperLower(price);
}

calcUpperLowerByCurrentPrice();

export { calculatePosition, adjustPriceWithThreshold, calculatePriceAdjustments, calcUpperLower };
