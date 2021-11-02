import { ChainId, Token, Fetcher, Route, TokenAmount, Trade, TradeType } from "@uniswap/sdk";
import { Utils } from "./utils";


export class UniSwapV2 {

    private chainId: ChainId;

    constructor(chainId: ChainId) {
        this.chainId = chainId
    }

    public async fetchTokenData(tokenAddress: string) {
        return await Fetcher.fetchTokenData(this.chainId, tokenAddress);
    }

    public async fetchPair(tokenA: Token, tokenB: Token) {
        return await Fetcher.fetchPairData(tokenA, tokenB);
    }

    public async fetchPrice(tokenA: Token, tokenB: Token) {
        const pair = await Fetcher.fetchPairData(tokenA, tokenB);
        const route = new Route([pair], tokenA);
        return route.midPrice.toSignificant(6);
    }


    public async measureTradeAmounByInput(inputToken: string, amount: string, tokenA: Token, tokenB: Token) {

        const inputAmount = this.generate_token_amount(tokenA, amount);
        const pair = await this.fetchPair(tokenA, tokenB);
        const route = new Route([pair], tokenA);
        const trade = new Trade(
            route,
            inputAmount,
            TradeType.EXACT_INPUT
        );
        console.log("exec price", trade.executionPrice.toSignificant(6));
        console.log("if input amount: ", trade.inputAmount.toSignificant(6), inputToken);
        console.log("output amount: ", trade.outputAmount.toSignificant(6));
    }

    public async measureTradeAmounByOutput(inputToken: string, amount: string, tokenA: Token, tokenB: Token) {

        const outputAmount = this.generate_token_amount(tokenA, amount);
        const pair = await this.fetchPair(tokenB, tokenA);

        const inputAmount = pair.getInputAmount(outputAmount)[0]
        const route = new Route([pair], tokenB);
        const trade = new Trade(
            route,
            outputAmount,
            TradeType.EXACT_OUTPUT
        );
        console.log("exec price", trade.executionPrice.toSignificant(6));
        console.log("if output amount: ", outputAmount.toSignificant(6), inputToken);
        console.log("input amount: ", inputAmount.toSignificant(6));
    }

    generate_token_amount(token: Token, amount: string) {
        return new TokenAmount(token, Utils.absAmountToRawAmount(amount, token))
    }
}
