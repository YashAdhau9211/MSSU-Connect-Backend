 import { neon } from "@neondatabase/serverless";

 import "dotenv/config";

 // Creates an sql connection using your db URL
 export const sql = neon(process.env.DATABASE_URL)