import mongoose from "mongoose";

const connectDatabase = async (): Promise<void> => {
  try {
<<<<<<< HEAD
    const mongoUri = process.env.MONGODB_URI_ATLAS;

    if (!mongoUri) {
      throw new Error("MONGODB_URI_ATLAS is not defined");
=======
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error("MONGODB_URI is not defined");
>>>>>>> origin/main
    }

    await mongoose.connect(mongoUri);

    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    throw error;
  }
};

export default connectDatabase;
