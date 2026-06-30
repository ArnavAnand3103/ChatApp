import mongoose from 'mongoose';
const blockedSchema = new mongoose.Schema({
    user: String,
    blockedUser: String
});

export default mongoose.model('BlockedUser', blockedSchema);
