import { BN } from "@project-serum/anchor";
import { MathUtil } from "@orca-so/common-sdk";
import Decimal from "decimal.js";
import { u64 } from "@solana/spl-token";


export async function getTokenAmountsFromLiquidity(
    liquidity: BN,
    currentSqrtPrice: BN,
    lowerSqrtPrice: BN,
    upperSqrtPrice: BN,
    round_up: boolean
): Promise<any> {
    const _liquidity = new Decimal(liquidity.toString());
    const _currentPrice = new Decimal(currentSqrtPrice.toString());
    const _lowerPrice = new Decimal(lowerSqrtPrice.toString());
    const _upperPrice = new Decimal(upperSqrtPrice.toString());
    let tokenA: any, tokenB: any;
    if (currentSqrtPrice.lt(lowerSqrtPrice)) {
        // x = L * (pb - pa) / (pa * pb)
        tokenA = MathUtil.toX64_Decimal(_liquidity)
            .mul(_upperPrice.sub(_lowerPrice))
            .div(_lowerPrice.mul(_upperPrice));
        tokenB = new Decimal(0);
    } else if (currentSqrtPrice.lt(upperSqrtPrice)) {
        // x = L * (pb - p) / (p * pb)
        // y = L * (p - pa)
        tokenA = MathUtil.toX64_Decimal(_liquidity)
            .mul(_upperPrice.sub(_currentPrice))
            .div(_currentPrice.mul(_upperPrice));
        tokenB = MathUtil.fromX64_Decimal(_liquidity.mul(_currentPrice.sub(_lowerPrice)));
    } else {
        // y = L * (pb - pa)
        tokenA = new Decimal(0);
        tokenB = MathUtil.fromX64_Decimal(_liquidity.mul(_upperPrice.sub(_lowerPrice)));
    }

    // TODO: round up

    if (round_up) {
        return {
            tokenA: new u64(tokenA.ceil().toString()),
            tokenB: new u64(tokenB.ceil().toString()),
        };
    } else {

        return {
            tokenA: new u64(tokenA.floor().toString()),
            tokenB: new u64(tokenB.floor().toString()),
        };
    }
}