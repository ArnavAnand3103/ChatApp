import mongoose from 'mongoose';
import User from './Backend/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

(async () => {
    try {
        await mongoose.connect("mongodb://127.0.0.1:27017/chatapp");
        console.log("Connected to MongoDB");

        const result = await User.deleteOne({ name: "Priya Two" });
        
        if (result.deletedCount === 1) {
            console.log("✓ Priya Two deleted successfully");
        } else {
            console.log("✗ Priya Two not found");
        }

        await mongoose.connection.close();
        console.log("Disconnected from MongoDB");
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
})();
