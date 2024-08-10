import { isValidObjectId } from "mongoose";
import { asyncHandler } from "../../utils/asyncHandler.js"
import { ApiError } from "../../utils/apiError.js";
import { deleteImageFromCloudinaryViaPublicId, uploadVideoOnCloudinary } from "../../utils/uploadFileOnCloudinary.js";
import { Post } from "../../models/Post.model.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { PostLike } from "../../models/Like.model.js";
import { ObjectId } from "mongodb";
import { PostBookmark } from "../../models/bookmark.model.js";
import { PostComment } from "../../models/Comment.model.js";

// get posts
export const getPosts = asyncHandler(async (req, res) => {
    const posts = await Post.aggregate(
        [
            {
                $sort: {
                    _id: -1
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "ownerArr"
                }
            },
            {
                $addFields: {
                    channel: {
                        fullName: {
                            $arrayElemAt: ["$ownerArr.fullName", 0]
                        },
                        avatar: {
                            $arrayElemAt: ["$ownerArr.avatar", 0]
                        },
                        username: {
                            $arrayElemAt: ["$ownerArr.username", 0]
                        }
                    }
                }
            },
            {
                $unset: ["ownerArr"]
            }
        ]
    )
    if (!posts) {
        throw new ApiError(400, "posts not found")
    }
    res
        .status(200)
        .json(
            new ApiResponse(200, posts, "Posts fetched")
        )
})

// get a posts stats
export const getPostStates = asyncHandler(async (req, res) => {
    const id = req.params?.id;
    const totalLike = await PostLike.aggregate(
        [
            {
                $match: {
                    post: new ObjectId(id),
                    like: true
                }
            },
            {
                $count: "totalLike"
            }
        ]
    )
    const totalBookmark = await PostBookmark.aggregate(
        [
            {
                $match: {
                    post: new ObjectId(id),
                    bookmark: true
                }
            },
            {
                $count: "totalBookmark"
            }
        ]
    )
    const totalComment = await PostComment.aggregate(
        [
            {
                $match: {
                    post: new ObjectId(id),
                }
            },
            {
                $count: "totalComment"
            }
        ]
    )
    res.send({ ...totalLike[0], ...totalBookmark[0], ...totalComment[0] })
    // res.send({ totalLike, totalBookmark, totalComment })
})

export const createPost = asyncHandler(async (req, res) => {
    const owner = req.params.userId;
    const { content, title } = req.body;
    if (!owner || !isValidObjectId(owner)) {
        throw new ApiError(400, "Invalid id")
    }
    if (!content) {
        throw new ApiError(400, "all fields are required")
    }
    const data = {
        owner,
        content,
        media: []
    }
    if (req.body?.title) {
        data.title = title
    }
    if (req.files?.image?.[0]) {
        const uploadResult = await uploadVideoOnCloudinary(req.files?.image?.[0].path)
        if (uploadResult) {
            data.image = uploadResult
        }
    }
    if (req.files?.media?.[0]) {
        // Here i am using this function because it will return an object
        const uploadResult = await uploadVideoOnCloudinary(req.files.media[0]?.path)
        if (uploadResult) {
            data.media.push(uploadResult);
        }
    }
    const result = await Post.create(data);
    if (!result) {
        throw new ApiError(500, "Something went wrong")
    }
    res
        .status(200)
        .json(
            new ApiResponse(200, result, "post created")
        )
})
// update post
export const updatePost = asyncHandler(async (req, res) => {
    // A lot of work remains in this function
    const id = req.params?.id;
    if (!id || !isValidObjectId(id)) {
        throw new ApiError(400, "Invalid id")
    }
    const post = await Post.findById(id)
    if (!post) {
        throw new ApiError(404, "Post not found")
    }
    if (req.body?.content) {
        post.content = req.body?.content
    }
    if (req.body?.title) {
        post.title = req.body?.title
    }
    if (req.files?.image?.[0]) {
        const uploadResult = await uploadVideoOnCloudinary(req.files?.image?.[0]?.path)
        if (uploadResult) {
            deleteImageFromCloudinaryViaPublicId(post.image?.public_id)
            post.image = uploadResult;
        }
    }

    // skip media for now

    // save on db
    const result = await post.save()
    if (!result) {
        throw new ApiError(500, "Something went wrong, when updating")
    }
    res
        .status(200)
        .json(
            new ApiResponse(200, result, "Post updated")
        )
})

// delete post
export const deletePost = asyncHandler(async (req, res) => {
    const id = req.params?.id;
    if (!id || !isValidObjectId(id)) {
        throw new ApiError(400, "Invalid id")
    }
    const result = await Post.findByIdAndDelete(id)
    if (!result) {
        throw new ApiError(404, "post not found!")
    }
    if (result && result?.image) {
        deleteImageFromCloudinaryViaPublicId(result?.image?.public_id)
    }
    res
        .json(
            new ApiResponse(200, result, "Post deleted")
        )
})
