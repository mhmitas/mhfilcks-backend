import { isValidObjectId } from "mongoose";
import { Subscription } from "../../models/Subscribe.model.js";
import { User } from "../../models/user.model.js";
import { ApiError } from "../../utils/apiError.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { uploadFileOnCloudinary } from "../../utils/uploadFileOnCloudinary.js";
import { ObjectId } from "mongodb";

// export const updateProfile = asyncHandler(async (req, res) => {
//     const email = req.params?.email
//     let updateData = {}

//     if (req.body?.fullName) {
//         updateData.fullName = req.body?.fullName
//     }
//     if (req.body?.about) {
//         updateData.about = req.body?.about
//     }
//     if (req.files?.avatar) {
//         const avatar = await uploadFileOnCloudinary(req.files?.avatar[0]?.path)
//         updateData.avatar = avatar
//     }
//     if (req.files?.coverImage) {
//         const coverImage = await uploadFileOnCloudinary(req.files?.coverImage[0]?.path)
//         updateData.coverImage = coverImage
//     }
//     console.log(updateData);

//     const result = await User.updateOne({ email }, {
//         $set: updateData
//     })
//     if (!result) {
//         throw new ApiError(500, "Something went wrong when updating user profile")
//     }
//     res
//         .status(200)
//         .json(
//             new ApiResponse(200, result, "Profile updated")
//         )
// })
export const updateProfile = asyncHandler(async (req, res) => {
    const id = req.params?._id
    if (!id || !isValidObjectId(id)) {
        throw new ApiError(400, "invalid user id")
    }
    const user = await User.findById(id)
    if (!user) {
        throw new ApiError(404, "user not found")
    }
    if (req.body?.fullName) {
        user.fullName = req.body?.fullName
    }
    if (req.body?.about) {
        user.about = req.body?.about
    }
    if (req.files?.avatar) {
        const avatar = await uploadFileOnCloudinary(req.files?.avatar[0]?.path)
        user.avatar = avatar
    }
    if (req.files?.coverImage) {
        const coverImage = await uploadFileOnCloudinary(req.files?.coverImage[0]?.path)
        user.coverImage = coverImage
    }

    const result = await user.save()
    if (!result) {
        throw new ApiError(500, "Something went wrong when updating user profile")
    }
    const updatedUser = await User.findById(id).select("-password");
    res
        .status(200)
        .json(
            new ApiResponse(200, updatedUser, "Profile updated")
        )
})

// check if a user exists
export const getIsUserExists = asyncHandler(async (req, res) => {
    const username = req.params?.username
    if (!username) {
        throw new ApiError(400, "username is required")
    }
    const isExists = await User.exists({ username })
    if (!isExists) {
        throw new ApiError(404, "User not found")
    }
    res
        .status(200)
        .json(
            new ApiResponse(200, isExists, 'user exists')
        )
})

// get a user's public profile data
export const getUserPublicProfileData = asyncHandler(async (req, res) => {
    const channelId = req.params?.channelId;
    const currentUser = req.query?.currentUser;

    if (!channelId || !isValidObjectId(channelId)) {
        throw new ApiError(400, "channelId is required and it should be valid object id")
    }
    // find channel's data
    const result = await User.aggregate(
        [
            {
                $match: {
                    _id: new ObjectId(channelId)
                }
            },
            {
                $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                    coverImage: 1,
                    about: 1,
                    createdAt: 1
                }
            },
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "channel",
                    as: "subscriptionArr"
                }
            },
            {
                $lookup: {
                    from: "videos",
                    localField: "_id",
                    foreignField: "owner",
                    as: "videosArr"
                }
            },
            {
                $addFields: {
                    stats: {
                        subscribers: {
                            $cond: {
                                if: { $isArray: "$subscriptionArr" },
                                then: { $size: "$subscriptionArr" },
                                else: "NA"
                            }
                        },
                        videos: {
                            $cond: {
                                if: { $isArray: "$videosArr" },
                                then: { $size: "$videosArr" },
                                else: "NA"
                            }
                        }
                    }
                }
            },
            {
                $unset: ["videosArr", "subscriptionArr"]
            }
        ]
    )
    if (!result || result.length === 0) {
        throw new ApiError(404, "Profile not found")
    }
    const profile = result[0]
    // check if the user is a subscriber or not;
    if (currentUser && isValidObjectId(currentUser)) {
        const isSubscribed = await Subscription.exists({ channel: channelId, subscriber: currentUser })
        profile.isSubscribed = !!isSubscribed;
    }
    res
        .status(200)
        .json(
            new ApiResponse(200, profile, "user public profile fetched")
        )
})

export const getUserData = asyncHandler(async (req, res) => {
    const userId = req.params?.userId
    if (!userId || !isValidObjectId(userId)) {
        throw new ApiError(400, "userId is required and it should be valid object id")
    }
    const userData = await User.aggregate(
        [
            {
                $match: {
                    _id: new ObjectId(userId)
                }
            },
            {
                $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                    coverImage: 1,
                    about: 1,
                    createdAt: 1
                }
            },
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "channel",
                    as: "subscriptionArr"
                }
            },
            {
                $lookup: {
                    from: "videos",
                    localField: "_id",
                    foreignField: "owner",
                    as: "videosArr"
                }
            },
            {
                $addFields: {
                    stats: {
                        subscribers: {
                            $cond: {
                                if: { $isArray: "$subscriptionArr" },
                                then: { $size: "$subscriptionArr" },
                                else: "NA"
                            }
                        },
                        videos: {
                            $cond: {
                                if: { $isArray: "$videosArr" },
                                then: { $size: "$videosArr" },
                                else: "NA"
                            }
                        }
                    }
                }
            },
            {
                $unset: ["videosArr", "subscriptionArr"]
            }
        ]
    )
    if (!userData || userData.length === 0) {
        throw new ApiError(404, "user data not found")
    }
    res
        .status(200)
        .json(
            new ApiResponse(200, userData[0])
        )
})