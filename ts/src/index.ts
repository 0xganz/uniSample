import { UniSwapV2 } from './uniswapV2';
import IUniswapV2Router02 from "@uniswap/v2-periphery/build/IUniswapV2Router02.json";
import IERC20 from '@uniswap/v2-core/build/IERC20.json';
import { ChainId, Token } from "@uniswap/sdk";
import { Command } from './command';
import { Utils } from './utils';
import Web3 from 'web3';
import type { Contract } from 'web3-eth-contract';
import fs from "fs";
import path from "path";
import type { AbiItem } from 'web3-utils';

const fileContent = fs.readFileSync(path.join(__dirname, "../account.json")).toString();
const accountInfo = JSON.parse(fileContent);


const account_address = accountInfo['pubkey'];
const account_prvkey_hex = accountInfo['privatekey']

const wethTokenAddress = '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6';
const univ2SwapRouterAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
const lzTokenAddress = '0x72035Cdc5B39ae2686Db775FE0037A8B4f22C45f';
// const uniSwapV2WethLzAddress = '0xd71cb776a17091e737ec0d19e3cd6d6369f63acb';
const goerli_rpc_server = 'https://goerli.infura.io/v3/65217be2d032403eab92e7f051dd272e';


async function approve_account(token: Token) {
    const web3 = new Web3(goerli_rpc_server);
    const defaultAccount = web3.eth.defaultAccount;
    if (!defaultAccount) {
        const acc = web3.eth.accounts.privateKeyToAccount(account_prvkey_hex);
        web3.eth.defaultAccount = acc.address;
        web3.eth.accounts.wallet.add(acc);
    }

    const erc20_contract = new web3.eth.Contract(IERC20.abi as AbiItem[], token.address);
    erc20_contract.options.from = account_address; // default from address
    erc20_contract.options.gasPrice = '2000000000'; // default gas price in wei
    erc20_contract.options.gas = 15678;

    const result = await erc20_contract.methods.approve(univ2SwapRouterAddress, '999999999999999999999999999999').send({
        gasLimit: 303305,
    });
    console.log(result);
}

function initWeb3() {
    const web3 = new Web3(goerli_rpc_server);
    const defaultAccount = web3.eth.defaultAccount;
    if (!defaultAccount) {
        const acc = web3.eth.accounts.privateKeyToAccount(account_prvkey_hex);
        web3.eth.defaultAccount = acc.address;
        web3.eth.accounts.wallet.add(acc);
    }
    const uni_weth_lz_contract = new web3.eth.Contract(IUniswapV2Router02.abi as AbiItem[], univ2SwapRouterAddress);
    uni_weth_lz_contract.options.from = account_address; // default from address
    uni_weth_lz_contract.options.gasPrice = '2000000000'; // default gas price in wei
    uni_weth_lz_contract.options.gas = 23964;
    return { web3, contract_abi: uni_weth_lz_contract };
}

async function web3_swap(web3: Web3, uni_weth_lz_contract: Contract, tokenA: Token, tokenB: Token, amount: string) {
    // contract defined
    // function swapExactTokensForTokens(
    //     uint amountIn,
    //     uint amountOutMin,
    //     address[] calldata path,
    //     address to,
    //     uint deadline
    // ) 
    // web3.eth.subscribe('logs', {address:account_address}, (err,log)=>console.log(err, log))

    const amountIn = Utils.absAmountToRawAmount(amount, tokenA);
    const amountOutMin = Utils.absAmountToRawAmount('0', tokenB);
    const path = [tokenA.address, tokenB.address]
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

    const result = await uni_weth_lz_contract.methods.swapExactTokensForTokens(
        amountIn,
        amountOutMin,
        path,
        account_address,
        deadline).send({
            gasLimit: 273305,
        });

    console.log(result);
}



async function balance_info(web3: Web3, WETH: Token, LZ: Token) {
    const erc20_a_contract = new web3.eth.Contract(IERC20.abi as AbiItem[], WETH.address);
    const erc20_b_contract = new web3.eth.Contract(IERC20.abi as AbiItem[], LZ.address);

    const weth = await erc20_a_contract.methods.balanceOf(account_address).call();
    const lz = await erc20_b_contract.methods.balanceOf(account_address).call();
    const eth = await web3.eth.getBalance(account_address);

    console.log('ETH  :', web3.utils.fromWei(eth));
    console.log('WETH :', Utils.rawAmountToabsAmount(weth, WETH));
    console.log('LZ   :', Utils.rawAmountToabsAmount(lz, LZ));
}

async function print_transction(web3: Web3, contract: Contract, tx: string) {
    console.log('\n\n transaction \n\n', await web3.eth.getTransaction(tx));
    console.log('\n\n transaction Receipt \n\n', await web3.eth.getTransactionReceipt(tx));
}


async function run() {

    const uniswapV2 = new UniSwapV2(ChainId.GÖRLI);

    console.log("chainId", ChainId[ChainId.GÖRLI]);
    console.log("account address:", account_address);

    const WETH = await uniswapV2.fetchTokenData(wethTokenAddress);
    const LZ = await uniswapV2.fetchTokenData(lzTokenAddress);
    const pair_weth_lz = await uniswapV2.fetchPair(WETH, LZ);

    console.log("WETH token address:", WETH.address);
    console.log("LZ token address:", LZ.address);
    console.log("uni contract address:", pair_weth_lz.liquidityToken.address);
    console.log("unirouter contract address:", univ2SwapRouterAddress);
    // console.log("uni contract pair info:", pair_weth_lz);

    console.log("pool size: ( WETH: ", pair_weth_lz.reserveOf(WETH).toSignificant(6), ', LZ', pair_weth_lz.reserveOf(LZ).toSignificant(6), ")");
    console.log("1 WETH =", pair_weth_lz.priceOf(WETH).toSignificant(6), "LZ");
    console.log("1 LZ =", pair_weth_lz.priceOf(LZ).toSignificant(6), "WETH");

    initCommand(uniswapV2, WETH, LZ);
}

function generate_args(arrs: string[], weth: Token, lz: Token) {
    const key = arrs[0].toUpperCase();
    let tokenA, tokenB;

    if (key === 'WETH') {
        tokenA = weth;
        tokenB = lz
    } else if (key === 'LZ') {
        tokenA = lz;
        tokenB = weth
    } else {
        throw new Error('arg0: must be WETH or LZ');
    }

    return { key, tokenA, tokenB }
}



const command_header = "\n ====================== \n"
    + "SELECT: \n"
    + "1: GET POOL SIZE \n"
    + "2: MEASURE TRADE WHEN INPUT AMOUNT; args:[inputToken, inputAmount] \n"
    + "3: MEASURE TRADE WHEN OUTPUT AMOUNT; args:[outputToken, outputAmount]  \n"
    + "4: SWAP; args:[inputToken, inputAmount] \n"
    + "5: APPROVE; args: [token]\n"
    + "6: TRANSTION DETAILS: args: [transactionHash]\n"
    + "7: BALANCE INFO \n"
    + "h: COMMAND help \n"
    + "q: EXIT \n"
    + "===================== \n";

function initCommand(uniswapV2: UniSwapV2, WETH: Token, LZ: Token) {
    const command = new Command();
    command.putCommand('q', () => {
        process.exit();
    })
    command.putCommand('1', async () => {
        const pair = await uniswapV2.fetchPair(WETH, LZ);
        console.log("pool size: ( WETH: ", pair.reserveOf(WETH).toSignificant(6), ', LZ', pair.reserveOf(LZ).toSignificant(6), ")");
        console.log("1 WETH =", pair.priceOf(WETH).toSignificant(6), "LZ");
    })

    command.putCommand('2', async (arr: string[]) => {
        const { key, tokenA, tokenB } = generate_args(arr, WETH, LZ);

        await uniswapV2.measureTradeAmounByInput(key, arr[1], tokenA, tokenB)
    })

    command.putCommand('3', async (arr: string[]) => {
        const { key, tokenA, tokenB } = generate_args(arr, WETH, LZ);
        await uniswapV2.measureTradeAmounByOutput(key, arr[1], tokenA, tokenB);
    })

    const { web3, contract_abi } = initWeb3()
    command.putCommand('4', async (arr: string[]) => {
        const { tokenA, tokenB } = generate_args(arr, WETH, LZ);
        const amount = arr[1]
        await web3_swap(web3, contract_abi, tokenA, tokenB, amount);
    })

    command.putCommand('5', async (arr: string[]) => {
        const { tokenA } = generate_args(arr, WETH, LZ);
        await approve_account(tokenA);
    })

    command.putCommand('6', async (arr: string[]) => {
        const tx = arr[0].trim();
        if (tx && tx.length > 0) {
            await print_transction(web3, contract_abi, tx);
        }
    })

    command.putCommand('7', async () => {
        await balance_info(web3, WETH, LZ);
    })

    command.putCommand('h', () => {
        console.log(command_header);
    })

    console.log(command_header);

    process.stdin.resume();
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => {
        handleCommand(chunk, command);
    })
    return command;
}


async function handleCommand(chunk: string, command: Command) {
    chunk = chunk.replace(/[\n]/, '').trim();
    const values = chunk.split(/\s+/)
    const args = values.slice(1);
    const key = values[0]
    console.log("select", key, ", args", args)
    if (key && key.length > 0 && await command.execCommand(key, args)) {
        console.log("command end");
    } else {
        console.log('您输入的命令是： ' + chunk);
        console.warn('请输入正确指令：');
        console.log(command_header);
    }
}

run();
