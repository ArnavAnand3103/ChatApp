import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({ email: String, password: String });
const User = mongoose.model('User', UserSchema);

async function migrate() {
    await mongoose.connect('mongodb://127.0.0.1:27017/chatapp');
    const usersToFix = [
        'arnav.anand3103@gmail.com',
        'priya.anand3103@gmail.com'
    ];

    for (const email of usersToFix) {
        const user = await User.findOne({ email });
        if (user && !user.password.startsWith('$2a$')) {
            console.log(`Hashing password for ${email}...`);
            const hashedPassword = await bcrypt.hash(user.password, 10);
            user.password = hashedPassword;
            await user.save();
            console.log(`Successfully hashed ${email}.`);
        } else {
            console.log(`${email} already has a hashed password or doesn't exist.`);
        }
    }
    process.exit();
}
migrate();
