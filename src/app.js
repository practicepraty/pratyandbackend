import express from "express";
const app = express();

import cors from "cors"
import cookieParser from "cookie-parser"

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

//routes import
import userRouter from './routes/user.routes.js'
import aiRouter from './routes/ai.routes.js'

// routes declaration
app.use("/api/v1/users", userRouter)
app.use("/api/v1/ai", aiRouter)

export {app} 