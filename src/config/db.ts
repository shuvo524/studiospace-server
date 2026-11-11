import { MongoClient, Db } from "mongodb";

let db: Db | undefined;
let connectionPromise: Promise<Db> | null = null;

export function connectDB(): Promise<Db> {
  if (db) {
    return Promise.resolve(db);
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  const uri = process.env.DATABASE_URI;

  if (!uri) {
    throw new Error("DATABASE_URI is missing in the .env file");
  }

  connectionPromise = (async () => {
    const client = new MongoClient(uri);
    await client.connect();

    db = client.db("studiospace");
    console.log("MongoDB connected successfully");

    return db;
  })();

  // If connecting fails, clear the cached promise so the next call can retry.
  connectionPromise.catch(() => {
    connectionPromise = null;
  });

  return connectionPromise;
}

export function getDB(): Db {
  if (!db) {
    throw new Error("Database is not connected yet");
  }
  return db;
}
