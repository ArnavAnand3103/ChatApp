import mongoose from "mongoose";
const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

const messageSchema=new mongoose.Schema({

    from:{
        type:String,
        required:true

    },
    to:{
        type:String,
        required:true

    },
    message:{
        type:String,
        default:""


    },
    replyTo:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Message",
        default:null
    },
    replyText:{
        type:String,
        default:""
    },
    replySender:{
        type:String,
        default:""
    },

    messageType:{
        type:String,
        default:"text"
    },
    latitude: {
    type: Number,
    default: null
},

longitude: {
    type: Number,
    default: null
},

locationName: {
    type: String,
    default: ""
},

isLive: {
    type: Boolean,
    default: false
},

liveLocationId: {
    type: String,
    default: ""
},

expiresAt: {
    type: Date,
    default: null
},
    mediaUrl:{
        type:String,
        default:""
    },
    clientMessageId:{
        type:String,
        default:""
    },
    status:{
        type:String,
        default:"offline"
    },
    starred:{
        type:Boolean,
        default:false
    },
    edited:{
        type:Boolean,
        default:false
    },
    
    forwarded: {
    type: Boolean,
    default: false
},
    reactions: [
    {
        user: {
            type: String
        },
        emoji: {
            type: String
        },
        name: {
            type: String
        }
    }
],
    deletedForEveryone: {
    type: Boolean,
    default: false
},

deletedAt: {
    type: Date,
    default: null
},
    fileName: {
    type: String,
    default: ""
},
    createdAt:{
        type:Date,
        default:Date.now
    }
});

messageSchema.pre("validate", function () {
    const fromEmail = normalizeEmail(this.from);
    const toEmail = normalizeEmail(this.to);

    if (fromEmail && toEmail && fromEmail === toEmail) {
        throw new Error("Cannot message yourself");
    }
});

export default mongoose.model("Message",messageSchema);