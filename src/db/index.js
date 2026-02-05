import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";



// way to connect DB indirectly
 const connectDB = async ()=>{
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`MongoDB connected  DB HOST: ${connectionInstance.connection.host}`);
        
    } catch (error) {
        console.log("DB connection error: ",error);
        process.exit(1);
    }
}

export default connectDB