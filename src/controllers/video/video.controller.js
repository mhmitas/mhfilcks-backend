import { isValidObjectId } from "mongoose";
import { ObjectId } from "mongodb"
import { Video } from "../../models/video.model.js";
import { ApiError } from "../../utils/apiError.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { deleteImageFromCloudinary, uploadFileOnCloudinary, uploadVideoOnCloudinary } from "../../utils/uploadFileOnCloudinary.js";
import { VideoLike } from "../../models/Like.model.js";
import { Subscription } from "../../models/Subscribe.model.js";
import { User } from "../../models/user.model.js";

// .select("title thumbnail likes views createdAt duration owner")
export const getVideos = asyncHandler(async (req, res) => {
    const result = await Video.aggregate(
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
                $lookup: {
                    from: "videolikes",
                    localField: "_id",
                    foreignField: "video",
                    as: "videolikes"
                }
            },
            {
                $addFields: {
                    likes: {
                        $size: {
                            $filter: {
                                input: "$videolikes",
                                as: "likeObj",
                                cond: {
                                    $eq: [true, "$$likeObj.like"]
                                }
                            }
                        }
                    }
                }
            },
            {
                $unset: ["videolikes", "ownerArr", "videos"]
            }
        ]
    )
    if (!result) {
        throw new ApiError(500, "Something went wrong - fetch videos")
    }
    res
        .status(200)
        .json(
            new ApiResponse(200, result)
        )
})

// data for video player page
// 1
export const getVideo = asyncHandler(async (req, res) => {
    const id = req.params.id;
    if (!isValidObjectId(id)) {
        throw new ApiError(400, "Invalid video id")
    }
    const video = await Video.findById(id).select("video title")
    res
        .status(200)
        .json(
            new ApiResponse(200, video, "Get a video fetched")
        )
})
// 2
export const getAVideoPageData = asyncHandler(async (req, res) => {
    const id = req.params.id;
    if (!isValidObjectId(id)) {
        throw new ApiError(400, "Invalid video id")
    }
    const result = await Video.aggregate([
        [
            {
                $match: {
                    _id: new ObjectId(id)
                }
            },
            // deal with channel data
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "channelObj"
                }
            },
            {
                $set: {
                    channelObj: {
                        $first: "$channelObj"
                    }
                }
            },
            {
                $set: {
                    channel: {
                        channelId: "$channelObj._id",
                        channelName: "$channelObj.fullName",
                        channelAvatar: "$channelObj.avatar",
                        channelUsername: "$channelObj.username",
                    }
                }
            },
            {
                $unset: "channelObj"
            },
            // deal with likes
            {
                $lookup: {
                    from: "videolikes",
                    localField: "_id",
                    foreignField: "video",
                    as: "videolikesArr"
                }
            },
            {
                $addFields: {
                    likeCount: {
                        $size: {
                            $filter: {
                                input: "$videolikesArr",
                                as: "obj",
                                cond: {
                                    $eq: ["$$obj.like", true]
                                }
                            }
                        }
                    }
                }
            },
            {
                $addFields: {
                    unlikeCount: {
                        $size: {
                            $filter: {
                                input: "$videolikesArr",
                                as: "obj",
                                cond: {
                                    $eq: ["$$obj.like", false]
                                }
                            }
                        }
                    }
                }
            },
            // deal with subscriptions
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "owner",
                    foreignField: "channel",
                    as: "subscriberArr"
                }
            },
            {
                $set: {
                    subscriber: {
                        $size: "$subscriberArr"
                    }
                }
            },
            {
                $unset: ["videolikesArr", "subscriberArr", "video"]
            }
        ]
    ])
    if (!result) {
        throw new ApiError(500, "Something went wrong when getAVideoPageData")
    }
    res
        .status(200)
        .json(
            new ApiResponse(400, result[0], "get a video data fetch")
        )
})
// 3
export const getLikeAndSubscribe = asyncHandler(async (req, res) => {
    const videoId = req.params?.id;
    const userId = req.query?.userId;
    if (!isValidObjectId(videoId) || !isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid object id")
    }
    const videoOwner = await Video.findById(videoId).select("owner -_id")
    if (!videoOwner) {
        throw new ApiError(500, "Something went wrong [video owner not found]")
    }
    const likeObj = await VideoLike.findOne({ user: new ObjectId(userId), video: new ObjectId(videoId) })
    const subscribeObj = await Subscription.findOne({ subscriber: new ObjectId(userId), channel: videoOwner.owner })
    res
        .status(200)
        .json(
            new ApiResponse(200, { likeObj, subscribeObj })
        )
})

// get videos of a channel
export const getAChannelsVideos = asyncHandler(async (req, res) => {
    const username = req.params?.username;
    const userId = await User.findOne({ username }).select("_id")
    if (!userId) {
        throw new ApiError(404, "Profile not found")
    }
    // find videos
    const videos = await Video.aggregate(
        [
            {
                $match: {
                    owner: userId?._id
                }
            },
            {
                $sort: {
                    _id: -1
                }
            },
            {
                $lookup: {
                    from: "videolikes",
                    localField: "_id",
                    foreignField: "video",
                    as: "videolikes"
                }
            },
            {
                $addFields: {
                    likes: {
                        $size: {
                            $filter: {
                                input: "$videolikes",
                                as: "likeObj",
                                cond: {
                                    $eq: [true, "$$likeObj.like"]
                                }
                            }
                        }
                    }
                }
            },
            {
                $unset: [
                    "videolikes",
                    "video",
                    // "description" 
                ]
            }
        ]
    )
    if (!videos) {
        throw new ApiError(500, `something went wrong - getAChannelsVideo`)
    }
    res
        .status(200)
        .json(
            new ApiResponse(200, videos, "Channels videos fetched")
        )
})

// upload a video
export const uploadVideo = asyncHandler(async (req, res) => {
    const { title, duration, description, owner } = req.body
    if (!title || !duration || !description || !owner) {
        throw new ApiError(400, "all fields are required")
    }
    if (!req.files?.video || !req.files?.thumbnail) {
        throw new ApiError(400, "video and thumbnail is required")
    }
    const video = await uploadVideoOnCloudinary(req.files?.video[0]?.path)
    const thumbnail = await uploadFileOnCloudinary(req.files?.thumbnail[0]?.path)
    // make document
    const doc = {
        title, duration, description, owner, video, thumbnail, assetsDetail: { cloud: "dquqygs9h" }
    }
    const result = await Video.create(doc)
    if (!result) {
        throw new ApiError(500, "something went wrong when video uploading")
    }
    res
        .status(200)
        .json(
            new ApiResponse(200, result, "video created")
        )
})
// update a video
export const updateVideo = asyncHandler(async (req, res) => {
    const id = req.params?.id;
    if (!id || !isValidObjectId(id)) {
        throw new ApiError(400, "invalid user id")
    }
    const video = await Video.findById(id)
    if (!video) {
        throw new ApiError(404, "video not found")
    }
    if (req?.body?.title) {
        video.title = req?.body?.title
    }
    if (req?.body?.description) {
        video.description = req?.body?.description
    }
    if (req?.body?.duration) {
        video.duration = req?.body?.duration
    }
    if (req.files?.thumbnail?.[0]) {
        deleteImageFromCloudinary(video.thumbnail)
        video.thumbnail = await uploadFileOnCloudinary(req.files?.thumbnail?.[0]?.path)
    }
    const result = await video.save()
    if (!result) {
        throw new ApiError(500, "Something went wrong when updating video")
    }
    const updatedVideo = await Video.findById(id).select("-video");
    res
        .status(200)
        .json(
            new ApiResponse(200, updateVideo, "video updated")
        )
})



















// draft
// {
//     $lookup: {
//         from: "users",
//         localField: "owner",
//         foreignField: "_id",
//         as: "ownerArr"
//     }
// },
// {
//     $addFields: {
//         channel: {
//             fullName: {
//                 $arrayElemAt: ["$ownerArr.fullName", 0]
//             },
//             avatar: {
//                 $arrayElemAt: ["$ownerArr.avatar", 0]
//             },
//             username: {
//                 $arrayElemAt: ["$ownerArr.username", 0]
//             }
//         }
//     }
// },