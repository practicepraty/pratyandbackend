import express from "express";
const app = express();

import cors from "cors"
import cookieParser from "cookie-parser"
import { errorHandler } from "./middlewares/errorHandler.middleware.js";

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
import templateRouter from './routes/template.routes.js'
import websiteGenerationRouter from './routes/websiteGeneration.routes.js'
import websiteRouter from './routes/websites.js'
import websitePublishRouter from './routes/websitePublish.routes.js'
import websiteVersionsRouter from './routes/websiteVersions.routes.js'

// routes declaration
app.use("/api/v1/users", userRouter)
app.use("/api/v1/ai", aiRouter)
app.use("/api/v1/templates", templateRouter)
app.use("/api/v1/website-generation", websiteGenerationRouter)
app.use("/api/v1/websites", websiteRouter)
app.use("/api/v1/websites", websitePublishRouter)
app.use("/api/v1/websites", websiteVersionsRouter)

// Global error handler (must be last)
app.use(errorHandler);

export {app}