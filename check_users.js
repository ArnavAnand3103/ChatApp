import mongoose from 'mongoose';
import User from './Backend/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

(async () => {
    try {
        await mongoose.connect("mongodb://127.0.0.1:27017/chatapp");
        console.log("Connected to MongoDB");

        const users = await User.find({}, { name: 1, email: 1 });
        console.log("\nUsers in database:");
        users.forEach(user => {
            console.log(`- Name: ${user.name}, Email: ${user.email}`);
        });

        await mongoose.connection.close();
        console.log("\nDisconnected from MongoDB");
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
})();
