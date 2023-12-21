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
    thresholdIncrements: number[],
    increase: boolean,
    amountA: number,
    liquidity: any,
    lower: number,
    upper: number,
    decimalA: number,
    decimalB: number
) {
    let prices = [];
    let currentPrice = futurePrice;

    for (let threshold of thresholdIncrements) {
        let incrementFactor = increase ? 0.0001 : -0.0001;
        while (true) {
            currentPrice += incrementFactor;
            let positionResult = await calculatePosition(currentPrice, liquidity, lower, upper, decimalA, decimalB);
            let tokenA = positionResult.tokenA;

            if ((currentPrice < 0) || (currentPrice > upper) || (currentPrice < lower)) {
                break;
            }
            if (!tokenA) {
                break;
            }

            let difference = Math.abs(amountA - tokenA);
            if (difference >= threshold) {
                prices.push({ price: currentPrice, tokenA: positionResult.tokenA });
                break;
            }
        }
    }

    return prices;
}

async function calculatePriceAdjustments(
    futurePrice: number,
    liquidity: any,
    lower: number,
    upper: number,
    decimalA: number,
    decimalB: number,
    thresholdIncrements: number[]
) {
    let { tokenA, tokenB } = await calculatePosition(futurePrice, liquidity, lower, upper, decimalA, decimalB);

    // Capture the initial values (the first iteration's results)
    let initialIncreased = await adjustPriceWithThreshold(futurePrice, [0], true, tokenA, liquidity, lower, upper, decimalA, decimalB);
    let initialDecreased = await adjustPriceWithThreshold(futurePrice, [0], false, tokenA, liquidity, lower, upper, decimalA, decimalB);

    let increasedPrices = await adjustPriceWithThreshold(futurePrice, thresholdIncrements, true, tokenA, liquidity, lower, upper, decimalA, decimalB);
    let decreasedPrices = await adjustPriceWithThreshold(futurePrice, thresholdIncrements, false, tokenA, liquidity, lower, upper, decimalA, decimalB);

    return {
        currentPosition: {
            price: futurePrice,
            tokenA,
            tokenB
        },
        upperPosition: initialIncreased[0], // Original upper position
        lowerPosition: initialDecreased[0], // Original lower position
        nextUpperPositions: increasedPrices,
        nextLowerPositions: decreasedPrices
    };
}


async function calcUpperLower(
    price: number,
     liquidity = 110309787400,
     lower = 80,
     upper = 90,
     decimalA = 9,
     decimalB = 6

) {
    try {


        let prices = await calculatePriceAdjustments(price,  liquidity,  lower,  upper,  decimalA,  decimalB , [1,2,3 , 4,5,6,7]);


        console.log(` prices are : ${JSON.stringify(prices, null, 4)}`);
    } catch (error) {
        console.error("Error:", error);
    }
}



calcUpperLower(88);

async function calcUpperLowerByCurrentPrice() {
    let price = await getFirstWhirlpoolPriceByWallet(new PublicKey(process.env.PUBKEY));
    calcUpperLower(price);
}

calcUpperLowerByCurrentPrice();

export { calculatePosition, adjustPriceWithThreshold, calculatePriceAdjustments, calcUpperLower };
