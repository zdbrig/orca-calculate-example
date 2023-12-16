import { PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import { getPositionsBywalletOrca } from "./getPositionsBywallet";
import * as dotenv from 'dotenv';

dotenv.config();

async function savePositionsToFile(publicKeyString: string) {
    try {
        const publicKey = new PublicKey(publicKeyString);
        const positions = await getPositionsBywalletOrca(publicKey);

        const filePath = path.resolve(__dirname, "positions.json");
        fs.writeFileSync(filePath, JSON.stringify(positions, null, 2));

        console.log(`Positions saved to ${filePath}`);
    } catch (error) {
        console.error("An error occurred:", error);
    }
}

// Replace 'your-public-key-here' with the actual public key
savePositionsToFile(process.env.PUBKEY);
