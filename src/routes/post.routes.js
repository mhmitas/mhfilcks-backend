import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { createPost, deletePost, getPosts, getPostStates, getUserPosts, updatePost, userStatusOfAPost } from "../controllers/posts/post.controller.js";
import { getCommentsOfAPost } from "../controllers/userActions/comment.controller.js";

export const postRouter = Router()

postRouter.route("/create-post/:userId").post(
    upload.fields([
        { name: "image", maxCount: 1 },
        { name: "media", maxCount: 1 }
    ]),
    createPost
)
postRouter.route("/update-post/:id").patch(
    upload.fields([
        { name: "image", maxCount: 1 },
    ]),
    updatePost
)
postRouter.route("/delete-post/:id").delete(deletePost)
postRouter.route("/all-posts").get(getPosts)
postRouter.route("/get-user-posts/:userId").get(getUserPosts)
postRouter.route("/post-stats/:id").get(getPostStates)
postRouter.route("/post/user-status/:id").get(userStatusOfAPost)
postRouter.route("/post-comments/:id").get(getCommentsOfAPost)