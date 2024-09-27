import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

export const app = express()

app.use(cors({
    origin: ['*', "http://localhost:5173", "http://localhost:3000"], credentials: true
}));
app.use(express.json({ limit: '16kb' }));
app.use(express.static('public'))
app.use(cookieParser())


// routes
// import routes
import { userRouter } from "./routes/user.routes.js";
import { videoRouter } from "./routes/video.routes.js";
import { userActionsRouter } from "./routes/userActions.routes.js";
import { testRouter } from "./routes/test.routes.js";
import { postRouter } from "./routes/post.routes.js";

// routes declaration
app.use("/api/v1/users", userRouter)
app.use("/api/v1/videos", videoRouter)
app.use("/api/v1/posts", postRouter)
app.use("/api/v1/user-actions", userActionsRouter)
app.use("/api/tests", testRouter)