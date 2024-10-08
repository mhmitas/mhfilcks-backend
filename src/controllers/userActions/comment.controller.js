import { isValidObjectId } from "mongoose";
import { ObjectId } from "mongodb"
import { ApiError } from "../../utils/apiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { PostComment, VideoComment } from "../../models/Comment.model.js";
import { ApiResponse } from "../../utils/apiResponse.js";

export const commentOnVideo = asyncHandler(async (req, res) => {
    const { user, video, comment } = req.body;
    if (!user || !video || !comment) {
        throw new ApiError(400, "All Fields are required")
    }
    if (!isValidObjectId(user) || !isValidObjectId(video)) {
        throw new ApiError(400, "Invalid ids")
    }
    const result = await VideoComment.create({ user, video, comment })
    if (!result) {
        throw new ApiError(500, "something went wrong - commentOnVideo")
    }
    res
        .status(200)
        .json(
            new ApiResponse(200, result, "comment success")
        )
})
export const updateVideoComment = asyncHandler(async (req, res) => {
    const commentId = req.params.commentId;
    const { updatedComment } = req.body;
    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid id")
    }
    const result = await VideoComment.findByIdAndUpdate(commentId, { $set: { comment: updatedComment } }, { new: true })
    if (!result) {
        throw new ApiError(500, "something went wrong - updateComment")
    }
    res
        .status(200)
        .json(
            new ApiResponse(200, result, "comment update success")
        )
})
export const deleteVideoComment = asyncHandler(async (req, res) => {
    const commentId = req.params.commentId;
    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid id")
    }
    const result = await VideoComment.deleteOne({ _id: new ObjectId(commentId) })
    if (!result) {
        throw new ApiError(500, "something went wrong - deleteVideoComment")
    }
    res
        .status(200)
        .json(
            new ApiResponse(200, result, "comment delete success")
        )
})
// get total comment count of a video
export const countCommentsOfAVideo = asyncHandler(async (req, res) => {
    const id = req.params?.id
    if (!isValidObjectId(id)) {
        throw new ApiError("invalid id")
    }
    const totalComments = await VideoComment.aggregate([
        {
            $match: {
                video: new ObjectId(id)
            }
        },
        {
            $count: 'totalComment'
        }
    ])
    res
        .status(200)
        .json(
            new ApiResponse(200, totalComments[0], "total comments")
        )
})
// get comments of a video
export const getCommentsOfAVideo = asyncHandler(async (req, res) => {
    const videoId = req.params?.id;
    if (!isValidObjectId(videoId)) {
        throw new ApiError("invalid inputs")
    }
    let limit = 10;
    if (parseInt(req.query?.limit)) {
        limit = req.query?.limit
    }

    // get comments
    const result = await VideoComment.aggregate([
        {
            $match: {
                video: new ObjectId(videoId)
            }
        },
        {
            $sort: {
                _id: -1
            }
        },
        {
            $limit: limit
        },
        {
            $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "userArr"
            }
        },
        {
            $addFields: {
                userObj: { $first: "$userArr" }
            }
        },
        {
            $addFields: {
                user: {
                    fullName: "$userObj.fullName",
                    userId: "$userObj._id",
                    avatar: "$userObj.avatar"
                }
            }
        },
        {
            $unset: ["userArr", "userObj"]
        }
    ])
    res
        .status(200)
        .json(
            new ApiResponse(200, result, "comments fetched")
        )
})


// post related
// comment on a post
export const commentOnPost = asyncHandler(async (req, res) => {
    const { user, post, comment } = req.body;
    if (!user || !post || !comment) {
        throw new ApiError(400, "All Fields are required")
    }
    if (!isValidObjectId(user) || !isValidObjectId(post)) {
        throw new ApiError(400, "Invalid ids")
    }
    const result = await PostComment.create({ user, post, comment })
    if (!result) {
        throw new ApiError(500, "something went wrong - commentOnVideo")
    }
    res
        .status(200)
        .json(
            new ApiResponse(200, result, "comment success")
        )
})
// update a post's comment
export const updatePostComment = asyncHandler(async (req, res) => {
    const commentId = req.params.commentId;
    const { updatedComment } = req.body;
    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid id")
    }
    const result = await PostComment.findByIdAndUpdate(commentId, { $set: { comment: updatedComment } }, { new: true })
    if (!result) {
        throw new ApiError(500, "something went wrong - updateComment")
    }
    res
        .status(200)
        .json(
            new ApiResponse(200, result, "comment update success")
        )
})
// delete a post's comment
export const deletePostComment = asyncHandler(async (req, res) => {
    const commentId = req.params.commentId;
    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid id")
    }
    const result = await PostComment.deleteOne({ _id: new ObjectId(commentId) })
    if (!result) {
        throw new ApiError(500, "something went wrong - deletePostComment")
    }
    res
        .status(200)
        .json(
            new ApiResponse(200, result, "comment delete success")
        )
})
// get comments of a video
export const getCommentsOfAPost = asyncHandler(async (req, res) => {
    const id = req?.params?.id
    if (!isValidObjectId(id)) {
        throw new ApiError("invalid inputs | id")
    }
    let limit = 10;
    if (parseInt(req.query?.limit)) {
        limit = req.query?.limit
    }
    const comments = await PostComment.aggregate(
        [
            {
                $match: {
                    post: new ObjectId(`${id}`)
                }
            },
            {
                $limit: limit
            },
            {
                $sort: {
                    _id: -1
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "user",
                    foreignField: "_id",
                    as: "commentatorArr"
                }
            },
            {
                $addFields: {
                    commentator: {
                        fullName: {
                            $arrayElemAt: [
                                "$commentatorArr.fullName",
                                0
                            ]
                        },
                        username: {
                            $arrayElemAt: [
                                "$commentatorArr.username",
                                0
                            ]
                        },
                        avatar: {
                            $arrayElemAt: [
                                "$commentatorArr.avatar",
                                0
                            ]
                        }
                    }
                }
            },
            {
                $unset: ["commentatorArr"]
            }
        ]
    )
    res
        .status(200)
        .json(
            new ApiResponse(200, comments, "comments fetched")
        )
})