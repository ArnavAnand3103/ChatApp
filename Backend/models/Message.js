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