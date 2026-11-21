import mongoose from "mongoose";

let connectionPromise: Promise<void> | null = null;

const connectDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState === 1) return;
  if (connectionPromise) return connectionPromise;

  const mongoUri = process.env.MONGODB_URI_ATLAS;

  if (!mongoUri) {
    throw new Error("MONGODB_URI_ATLAS is not defined");
  }

  connectionPromise = (async () => {
    try {
      await mongoose.connect(mongoUri);
      console.log("MongoDB connected successfully");
    } catch (error) {
      console.error("MongoDB connection failed:", error);
      throw error;
    } finally {
      connectionPromise = null;
    }
  })();

  return connectionPromise;
};

export default connectDatabase;
