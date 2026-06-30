import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
   name:{type:String,required:true},
   email:{
    type:String,
    required:true,
    unique:true
   },
   password:{
    type:String,
    required:true
   },

   photo:{
      type:String,
      default:""
   },
   isOnline:{type:Boolean,default:false},
   lastSeen:{type:Date,default:null},
   loginAttempts:{type:Number,default:0},
   lockUntil:{type:Date,default:null},
   resetToken:String,
   resetTokenExpiry:Date
});

const User = mongoose.model('User', userSchema);

export default User;
