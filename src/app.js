import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()
app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))

// configurations to receive data/json in server
app.use(express.json({limit:"16kb"})) // data received via form
app.use(express.urlencoded({extended:true,limit:"16kb"})) // via links 
app.use(express.static("public")) // to store any data like svg

// cookies (crud)
app.use(cookieParser())



// routes import

import userRouter from './routes/user.routes.js'

// routes declaration
app.use("/api/v1/users",userRouter)

export { app }