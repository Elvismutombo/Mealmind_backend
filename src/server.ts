import app from "./app.js";
import connectDatabase from "./config/database.js";
import { cleanupExpiredPendingRegistrations } from "./modules/auth/pending-registration.service.js";

const PORT = Number(process.env.PORT) || 5000;

const startServer = async (): Promise<void> => {
  try {
    await connectDatabase();

    const cleanupPendingRegistrations = () => {
      void cleanupExpiredPendingRegistrations().catch((error: unknown) => {
        console.error("Pending registration cleanup failed:", error);
      });
    };
    cleanupPendingRegistrations();
    const cleanupTimer = setInterval(
      cleanupPendingRegistrations,
      60 * 60 * 1000,
    );
    cleanupTimer.unref();

    app.listen(PORT, () => {
      console.log(`SmartRecipe API running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
};

startServer();