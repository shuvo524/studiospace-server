import { MongoClient, Db } from "mongodb";

let db: Db;

export async function connectDB(): Promise<Db> {
  const uri = process.env.DATABASE_URI;

  if (!uri) {
    throw new Error("DATABASE_URI is missing in the .env file");
  }

  const client = new MongoClient(uri);
  await client.connect();

  db = client.db("studiospace");
  console.log("MongoDB connected successfully");

  return db;
}

export function getDB(): Db {
  if (!db) {
    throw new Error("Database is not connected yet");
  }
  return db;
}