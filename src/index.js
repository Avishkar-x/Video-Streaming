import mongoose from "mongoose";
import { DB_NAME } from "./constants.js";
import express from "express";
import connectDB from "./db/index.js";


// way to import .env
// require('dotenv').config({path:'./env'})
import dotenv from "dotenv"
dotenv.config({
    path : './env'
})
// A way to connect DB
// const app = express()
// (async () => {
//     try {
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//         app.on("error", (er)=>{
//             console.log("Error : ",er);
//             throw er
//         })

//         app.listen(process.env.PORT, ()=>{
//             console.log(`App is listening on port ${process.env.PORT}`);
            
//         })
//     } catch (error) {
//         console.log("ERROR: ",error)
//         throw error
//     }
// })()

// Another way to connect
connectDB();