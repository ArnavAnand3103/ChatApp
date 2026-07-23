import mongoose from "mongoose";
const groupSchema=new mongoose.Schema({

    name:{
        type:String,
        required:true
    },

    members:[
        {
            type:String
        }
    ],
    admin:{
        type:String
    },
    photo:{
        type:String,
        default:""
    },
    groupKeys:{
        type: Map,
        of: String,
        default: {}
    },
    groupKeyVersion:{
        type: Number,
        default: 1
    },
    createdAt:{
        type:Date,
        default:Date.now
    }
});

export default mongoose.model("Group",groupSchema);