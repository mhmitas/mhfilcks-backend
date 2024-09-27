import dotenv from "dotenv"
dotenv.config()
import { User } from "../../models/user.model.js";
import { ApiError } from "../../utils/apiError.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";


// register user
export const registerUser = async (req, res) => {
    try {
        const { fullName, username, email, password } = req.body;
        // check if all data exists. if not throw error
        if (!fullName || !username || !email || !password) {
            throw new ApiError(400, "All Fields are Required")
        }

        // check if username already used
        const existingUsername = await User.exists({ username })
        if (existingUsername) {
            throw new Error("Username already used, Choose a different username");
        }

        // check if user already exist
        const existedUser = await User.findOne(
            { $or: [{ email }] }
        )

        if (existedUser) {
            throw new ApiError(400, "User already exist")
        }
        const userData = {
            fullName, username, email, password
        }
        // create user
        const result = await User.create(userData)
        // generate access and refresh token
        const { accessToken } = await generateAccessAndRefreshToken(result?._id)
        // find the created user in database
        // HERE is some issue + limitations
        const createdUser = await User.findById(result._id).select("-password")
        if (!createdUser) {
            throw new ApiError(500, "something went wrong when creating user")
        }
        // send response
        return res
            .status(200)
            .cookie("accessToken", accessToken, cookieOptions)
            .json(
                new ApiResponse(200, createdUser)
            )
    } catch (error) {
        console.log(error)
        return res.status(error?.statusCode || 400).json({ message: error.message })
    }
}

// sign in user
export const signInUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new ApiError(400, "email and password is required")
    }
    // find user in db with this email
    const dbUser = await User.findOne({ email })
    if (!dbUser) {
        throw new ApiError(404, "user not found")
    }
    // verify password
    const isPasswordCorrect = await dbUser.isPasswordCorrect(password)
    // console.log({ isPasswordCorrect })
    if (!isPasswordCorrect) {
        throw new ApiError(403, "Invalid Password")
    }
    // generate Access And RefreshToken
    const { accessToken } = await generateAccessAndRefreshToken(dbUser?._id)

    const user = await User.findById(dbUser?._id).select("-password -refreshToken")
    res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .json(
            new ApiResponse(200, user)
        )
})

// sign out user
export const signOutUser = asyncHandler(async (req, res) => {
    res
        .status(200)
        .clearCookie("accessToken", cookieOptions)
        .json(
            new ApiResponse(200, "sign out success")
        )
})

export const getCurrentUser = asyncHandler(asyncHandler(async (req, res) => {
    const id = req.user?._id;
    const user = await User.findById(id).select("-password -refreshToken")
    if (!user) {
        throw new ApiError(404, "User not found")
    }
    res
        .status(200)
        .json(
            new ApiResponse(200, user, "fetch current user success")
        )
}))

// generate access and refresh token
async function generateAccessAndRefreshToken(id) {
    try {
        const user = await User.findById(id)
        if (!user) {
            throw new ApiError(404, "user not found for generating cookie")
        }
        const accessToken = await user.generateAccessToken()
        // const refreshToken = await user.generateRefreshToken()

        // TODO: deal with refresh token later
        // user.refreshToken = refreshToken
        // await user.save({ validateBeforeSave: false })

        return { accessToken }
    } catch (err) {
        throw new ApiError(500, "something went wrong when generateAccessAndRefreshToken")
    }
}

const cookieOptions = {
    httpOnly: true,
    secure: true
}