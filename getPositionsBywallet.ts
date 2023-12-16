import { BN, AnchorProvider } from "@project-serum/anchor";
import {
  WhirlpoolContext, AccountFetcher, buildWhirlpoolClient, ORCA_WHIRLPOOL_PROGRAM_ID,
  PDAUtil, PriceMath, PoolUtil
} from "@orca-so/whirlpools-sdk";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { DecimalUtil, TokenUtil } from "@orca-so/common-sdk";
import { PublicKey } from "@solana/web3.js";
export async function getPositionsBywalletOrca(publicKey:PublicKey):Promise<any[]>{
  return new Promise(async (resolve, reject) => {
    try {
    const provider = AnchorProvider.env();
    //@ts-ignore
    const ctx = WhirlpoolContext.withProvider(provider, ORCA_WHIRLPOOL_PROGRAM_ID);
    const client = buildWhirlpoolClient(ctx);
    const fetcher = new AccountFetcher(ctx.connection);
  
    const token_accounts = (await ctx.connection.getTokenAccountsByOwner(publicKey, {programId: TOKEN_PROGRAM_ID})).value;
  
    const whirlpool_position_candidate_pubkeys = token_accounts.map((ta) => {
      const parsed = TokenUtil.deserializeTokenAccount(ta.account.data);
      const pda = PDAUtil.getPosition(ctx.program.programId, parsed.mint);
      return (parsed?.amount as BN).eq(new BN(1)) ? pda.publicKey : undefined;
    }).filter(pubkey => pubkey !== undefined);
  
    const whirlpool_position_candidate_datas = await fetcher.listPositions(whirlpool_position_candidate_pubkeys, true);
  
    const whirlpool_positions = whirlpool_position_candidate_pubkeys.filter((pubkey, i) => 
      whirlpool_position_candidate_datas[i] !== null
    );
  let positions = [];
      // Output the status of the positions
      for (let i=0; i < whirlpool_positions.length; i++ ) {
        const p = whirlpool_positions[i];
    
        // Get the status of the position
        const position = await client.getPosition(p);
        const data = position.getData();
    
        // Get the pool to which the position belongs
        const pool = await client.getPool(data.whirlpool);
        const token_a = pool.getTokenAInfo();
        const token_b = pool.getTokenBInfo();
        const price = PriceMath.sqrtPriceX64ToPrice(pool.getData().sqrtPrice, token_a.decimals, token_b.decimals);
    
        // Get the price range of the position
        const lower_price = PriceMath.tickIndexToPrice(data.tickLowerIndex, token_a.decimals, token_b.decimals);
        const upper_price = PriceMath.tickIndexToPrice(data.tickUpperIndex, token_a.decimals, token_b.decimals);
      
        // Calculate the amount of tokens that can be withdrawn from the position
        const amounts = PoolUtil.getTokenAmountsFromLiquidity(
          data.liquidity,
          pool.getData().sqrtPrice,
          PriceMath.tickIndexToSqrtPriceX64(data.tickLowerIndex),
          PriceMath.tickIndexToSqrtPriceX64(data.tickUpperIndex),
          true
        );
        
        let positionData = {
          "position": p.toBase58(),
          "positionMint": data.positionMint.toBase58(),
          "whirlpoolAddress": data.whirlpool.toBase58(),
          "whirlpoolPrice": price.toFixed(token_b.decimals),
          "tokenA": token_a.mint.toBase58(),
          "tokenB": token_b.mint.toBase58(),
          "liquidity": data.liquidity.toString(),
          "lower": lower_price.toFixed(token_b.decimals),
          "upper": upper_price.toFixed(token_b.decimals),
          "amountA": DecimalUtil.fromU64(amounts.tokenA, token_a.decimals).toString(),
          "amountB": DecimalUtil.fromU64(amounts.tokenB, token_b.decimals).toString(),
          "decimalA":token_a.decimals,
          "decimalB":token_b.decimals
        }
        positions.push(positionData)
      }
    return resolve(positions)
  }
  catch (error: any) {
    return reject(error)
    }
})
}

export async function getFirstWhirlpoolPriceByWallet(publicKey: PublicKey): Promise<number> {
  return new Promise(async (resolve, reject) => {
    try {
      const provider = AnchorProvider.env();
      //@ts-ignore
      const ctx = WhirlpoolContext.withProvider(provider, ORCA_WHIRLPOOL_PROGRAM_ID);
      const client = buildWhirlpoolClient(ctx);
      const fetcher = new AccountFetcher(ctx.connection);
  
      const token_accounts = (await ctx.connection.getTokenAccountsByOwner(publicKey, { programId: TOKEN_PROGRAM_ID })).value;
  
      const whirlpool_position_candidate_pubkeys = token_accounts.map((ta) => {
        const parsed = TokenUtil.deserializeTokenAccount(ta.account.data);
        const pda = PDAUtil.getPosition(ctx.program.programId, parsed.mint);
        return (parsed?.amount as BN).eq(new BN(1)) ? pda.publicKey : undefined;
      }).filter(pubkey => pubkey !== undefined);
  
      const whirlpool_position_candidate_datas = await fetcher.listPositions(whirlpool_position_candidate_pubkeys, true);
  
      const whirlpool_positions = whirlpool_position_candidate_pubkeys.filter((pubkey, i) => 
        whirlpool_position_candidate_datas[i] !== null
      );

      if (whirlpool_positions.length > 0) {
        const position = await client.getPosition(whirlpool_positions[0]);
        const pool = await client.getPool(position.getData().whirlpool);
        const token_a = pool.getTokenAInfo();
        const token_b = pool.getTokenBInfo();
        const price = PriceMath.sqrtPriceX64ToPrice(pool.getData().sqrtPrice, token_a.decimals, token_b.decimals);

        resolve(parseFloat(price.toFixed(token_b.decimals)));
      } else {
        resolve(0);
      }
    } catch (error) {
      reject(error);
    }
  });
}