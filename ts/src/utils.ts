import type { Token } from "@uniswap/sdk";

export class Utils {
    public static absAmountToRawAmount(amount:string, token:Token):bigint {
        return BigInt(Math.pow(10, token.decimals) * Number.parseFloat(amount));
    }

    public static rawAmountToabsAmount(amount:string, token:Token):string {
        return (parseInt(amount) / Math.pow(10, token.decimals)).toFixed(6);
    }
}