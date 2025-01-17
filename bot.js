import { PublicKey, Transaction, sendAndConfirmTransaction, ComputeBudgetProgram } from '@solana/web3.js';
import {
    createAssociatedTokenAccountInstruction
} from "@solana/spl-token";
import anchor from '@project-serum/anchor';


import {idl, wallet, connection, programId, program, globalAccount, feeRecipientAccount, eventAuchorityAccount, systemProgram, tokenProgram, rent, ASSOCIATED_TOKEN_PROGRAM_ID} from './pump_provider.js';

import {slippage, sellSlippage, priorityFee} from './setting.js';

import { whitelists } from './whitelists.js';

const getBondingCurve = (mint)=>{
    // For full guide, contact adtop1219 @discrod
}


// for full code, contact me adtop1219 @discord
const getBondingCurveInfo = async (bondingCurveAccount)=> {
    const result = await program.account.bondingCurve.fetch(bondingCurveAccount);
    return result;
}

const getTokenOut = async(bondingCurveAccount, buySolAmount)=>{
    const result = await getBondingCurveInfo(bondingCurveAccount);
    const tokenOut = result.virtualTokenReserves.sub(result.virtualTokenReserves.mul(result.virtualSolReserves).div((result.virtualSolReserves.add(buySolAmount))));
    const maxSolCost = Math.ceil(Number(buySolAmount) + Number(buySolAmount)*slippage/100);
    return {amount: tokenOut, maxSolCost: new anchor.BN(maxSolCost)}
}

const getSolOut = async(bondingCurveAccount, tokenAmount)=>{
    const result = await getBondingCurveInfo(bondingCurveAccount);
    const vS= result.virtualSolReserves;
    const vT= result.virtualTokenReserves;
    const tokenInInBN= tokenAmount;
    const solOut = vS.sub(vT.mul(vS).div(vT.add(tokenInInBN)));
    const minSolOutput = Math.ceil(Number(solOut)-Number(solOut)*sellSlippage/100);
    return {amount: tokenInInBN, minSolOutput: new anchor.BN(minSolOutput)}
}


let tradingStatus = false;

const buy = async (event) => {
    try{
        console.log('come here on buy');
        const bondingCurve = getBondingCurve(event.mint);
        const buyParams= await getTokenOut(bondingCurve, event.solAmount);
        // contact adtop1219 @discord for full code
        
        const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
            units: 2000000
          });
          const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: priorityFee
          });
        //   const recentBlockhash = await connection.getLatestBlockhash();
          const tx = new Transaction().add(modifyComputeUnits).add(addPriorityFee);
        // const tx = new Transaction();
        // tx.add(
        //     ComputeBudgetProgram.setComputeUnitLimit({
        //         units: 1_000_000, // Increase compute units (default ~200,000)
        //     }),
        //     ComputeBudgetProgram.setComputeUnitPrice({
        //         microLamports: priorityFee, // Priority fee (adjust as needed)
        //     })
        // );
        const associatedUserAccountInfo = await connection.getAccountInfo(associatedUser);
        // if associatedUser doens't exist, then add tx for that
        if(associatedUserAccountInfo == null){
            tx.add(
                createAssociatedTokenAccountInstruction(
                    wallet.publicKey,
                    associatedUser,
                    wallet.publicKey,
                    event.mint,
                    tokenProgram,
                    ASSOCIATED_TOKEN_PROGRAM_ID,
                ),
            );
        }
        

        const accounts = {
            global: globalAccount,
            feeRecipient: feeRecipientAccount,
            mint: event.mint,
            bondingCurve: bondingCurve,
            associatedBondingCurve: associatedBondingCurve,
            associatedUser: associatedUser,
            user: wallet.publicKey,
            systemProgram: systemProgram,
            tokenProgram: tokenProgram,
            rent: rent,
            eventAuthority: eventAuchorityAccount,
            program: programId,
        }
        const instruction = await program.methods
            .buy(
                buyParams.amount, buyParams.maxSolCost
            ).accounts(
                accounts
            ).instruction();
        console.log("instructions", instruction);
        tx.add(instruction);
        const result = await sendAndConfirmTransaction(connection, tx, [wallet], {skipPreflight: true });
        console.log("result", result);
        tradingStatus= false;
        return result;
    } catch (e) {
        tradingStatus= false;
        console.log('Slipage or RPC error if error consist, try to increase priority fee!', e);
        console.log('Keep continue to buy');
        return false;
    }
}

const sell = async (event) => {
    try{
        const bondingCurve = getBondingCurve(event.mint);
        // contact adtop1219 @discrod for full code
        const sellParams = await getSolOut(bondingCurve, event.tokenAmount);
        console.log("outreturned", Number(sellParams.minSolOutput));
        // const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        // const tx = new Transaction({recentBlockhash: blockhash,
        //     feePayer: wallet.publicKey,});
        const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
            units: 2000000
        });
        const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: priorityFee
        });
        const recentBlockhash = await connection.getLatestBlockhash();
        const tx = new Transaction().add(modifyComputeUnits).add(addPriorityFee);
        const accounts = {
            global: globalAccount,
            feeRecipient: feeRecipientAccount,
            mint: event.mint,
            bondingCurve: bondingCurve,
            associatedBondingCurve: associatedBondingCurve,
            associatedUser: associatedUser,
            user: wallet.publicKey,
            systemProgram: systemProgram,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            tokenProgram: tokenProgram,
            eventAuthority: eventAuchorityAccount,
            program: programId,
        }
        const instruction = await program.methods
            .sell(
                sellParams.amount, sellParams.minSolOutput
            ).accounts(
                accounts
            ).instruction();
        tx.add(instruction);
        const result = await sendAndConfirmTransaction(connection, tx, [wallet], {skipPreflight: true });
        console.log("sell result", result);

        tradingStatus= false;

    }catch(e){
        console.log("error on sell", e)
        tradingStatus= false;
        return false;
    }
}

let [tradeEvent, tradeSlot] = await new Promise((resolve, _reject)=>{
    program.addEventListener("TradeEvent", 
        async (tradeEvent, tradeSlot)=>{
            // console.log("TradeEvent", tradeEvent.user.toString());
            if(whitelists.includes(tradeEvent.user.toString())){
                console.log("come here to trade event user?", tradeEvent.user.toString())
                // detected trade event for a copy trader user
                if(tradingStatus){
                    // have to record this status to redis to sell later.
                    console.log("Unable to trade as another trading is on the way, let's save this status to sell later!");
                }else{
                    tradingStatus= true;
                    if(tradeEvent.isBuy==true){
                        buy(tradeEvent);
                        console.log("Copy buy successed!");
                    }else{
                        sell(tradeEvent);
                        console.log("Copy Sell successed!");
                    }
                }
            }
            resolve([tradeEvent, tradeSlot])
        }, { commitment: "processed" }
    )
})

// Start listening
// listenForCreateEvent();
// snipeTrade();