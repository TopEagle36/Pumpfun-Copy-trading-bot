import { Connection, PublicKey, clusterApiUrl, Keypair } from '@solana/web3.js';

import anchor from'@project-serum/anchor';
import bs58 from 'bs58';
import dotenv from 'dotenv'; 

import {HTTP_ENDPOINT} from './setting.js'

import idl from './pump-idl.json' with {type: 'json'}; 
dotenv.config();




// Your network configuration
const network = 'mainnet-beta';
const connection = new Connection(HTTP_ENDPOINT, 'confirmed');
// const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed')

// Load your program's IDL



const seedUnit8Array = bs58.decode(process.env.SEED);
const privateKeyBuffer = Buffer.from(seedUnit8Array)

let wallet = Keypair.fromSecretKey(privateKeyBuffer);
const programId = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
const provider = new anchor.AnchorProvider(connection, wallet, { preflightCommitment: 'confirmed' });
const program = new anchor.Program(idl, programId, provider);

// for full code, contact adtop1219 @discord
const mintAccount = new PublicKey('d1qo67HV7wT3Q5ed84ENfC19V3nHwcWNSbHwENNpump');
const userAccount = new PublicKey('7imrdTcfBmXgtLzjWWhwGaFJjXzZFrhwAK5U3DwtRGgj');
const bondingCurveAccount = new PublicKey('9n3PFyBrgwRhe47tFtfEMcLqAr3bEYB7CcWSj45Bjq1r');
// This account is for associated token account with bondingCurveAccount and mintAccount that token program created using associatedtokenprogram
// getAssociatedTokenAddressSync(mintAccount, bondingCurveAccount, tokenProgram, ASSOCIATED_TOKEN_PROGRAM_ID);
const associatedBondingCurve = new PublicKey('99rGf1uM7yQ1rwSc89vUGc5wQwY5QUWZDrTrxTDmfAv1'); 
// This account is for associated token account with userAccount and mintAccount that token program created using associatedtokenprogram
// getAssociatedTokenAddressSync(mintAccount, userAccount, tokenProgram, ASSOCIATED_TOKEN_PROGRAM_ID);
const associatedUser = new PublicKey('9GuwJQcqypbUq36J1sC9pTWq932RZ7qgPkt2ZiFzRrSn'); 
const systemProgram = new PublicKey('11111111111111111111111111111111');
const tokenProgram = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const rent = new PublicKey('SysvarRent111111111111111111111111111111111');
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

export {idl, connection, wallet, programId, provider, program, globalAccount, feeRecipientAccount, eventAuchorityAccount, systemProgram, tokenProgram, rent, ASSOCIATED_TOKEN_PROGRAM_ID}