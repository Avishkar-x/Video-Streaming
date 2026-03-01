import mongoose, {Schema, SchemaType} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const commentShema = new Schema(
    {
        content:{
            type: String,
            required:true 
        },
        video:{
            type:Schema.Types.ObjectId,
            ref:"Video"
        },
        owner:{
            type:Schema.Types.ObjectId,
            ref:"User"
        }
    },
    {
        timestamps:true
    }
)

commentShema.plugin(mongooseAggregatePaginate)

export const Comment = mongoose.model("Comment", commentShema)