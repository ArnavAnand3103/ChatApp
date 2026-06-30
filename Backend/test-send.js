import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

async function run() {
    try {
        await mongoose.connect("mongodb://127.0.0.1:27017/chatapp");
        const { default: User } = await import('./models/User.js');
        const arnav = await User.findOne({email: 'test@example.com'}) || await User.findOne({});
        if(!arnav) { console.log("no user"); process.exit(1); }
        
        const token = jwt.sign({ email: arnav.email, name: arnav.name }, process.env.JWT_SECRET || "SECRET_KEY", { expiresIn: "1h" });
        
        const other = await User.findOne({email: {$ne: arnav.email}});
        if (!other) {
            console.log("no other user to send to");
            process.exit(1);
        }

        const res2 = await fetch("http://localhost:5001/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                to: other.email, 
                message: "Test message 2",
                messageType: "text",
                clientMessageId: "1234"
            })
        });
        console.log("Other message response status:", res2.status);
        const json = await res2.text(); // text to handle non-json responses
        console.log("Other message response:", json);
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
run();
