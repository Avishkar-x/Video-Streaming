import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { apiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";
// separate method for tokens instead could be used from 'user'
const generateAccessAndRefreshToken = async (userId) => {
    console.log("Generating tokens for userId: ", userId)
    try {
        const user = await User.findById(userId)
        console.log("User found for token generation: ", user)
        const accessToken = user.generateAccessToken()
        console.log("Access token generated: ", accessToken)
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false }) // we dont req password(or other required) to save

        return { accessToken, refreshToken }

    } catch (error) {
        console.log("Token generation error: ", error)
        throw new apiError(500, "something went wrong while generating token")
    }
}


const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, username, password } = req.body // get data from frontend(json/from)
    console.log("Email: ", email);
    console.log(req.body);

    // validation
    if (
        [fullName, email, username, password].some((field) =>
            field.trim() === ""
        )
    ) {
        throw new apiError(400, "All fields are required")
    }

    // already exist?
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (existedUser) {
        throw new apiError(409, "User with email or username already exists")
    }

    // check for image and must avatar
    const avatarLocalPath = req.files?.avatar[0]?.path
    // const coverImageLocalPath = req.files?.coverImage[0]?.path 
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    if (!avatarLocalPath) {
        throw new apiError(400, "Avatar is necessary")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new apiError(500, "Avatar saving failed")
    }

    // make entry in db
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    // check if user successfully created
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if (!createdUser) {
        throw new apiError(500, "User creation failed")
    }

    // return registered profile
    return res.status(201).json(
        new apiResponse(200, createdUser, "Profile creation successful")
    )
})

const loginUser = asyncHandler(async (req, res) => {
    const { email, username, password } = req.body;
    if (!username && !email) {
        throw new apiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new apiError(404, "User doesnt exit")
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new apiError(404, "Wrong Password")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)
    // send tokens through cookies
    // we dont have instance in 'user' as cookies were saved later so we have to update user or apply new query
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    // make it before sending secure so no one can change in in frontEnd
    const options = {
        httpOnly: true,
        secure: false  // Set to false for localhost development, true for production
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new apiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken // optional to send
                },
                "User logged in successfully"

            )
        )
})


const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        }
    )

    const options = {
        httpOnly: true,
        secure: false  // Set to false for localhost development, true for production
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new apiResponse(200, {}, "User logged out"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const receivedRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if (!receivedRefreshToken) {
        throw new apiError(401, "Unauthorized request")
    }

    const decodedToken = jwt.verify(receivedRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    const user = await User.findById(decodedToken?._id)
    if (!user) {
        throw new apiError(401, "Invalid refresh token")
    }

    if (receivedRefreshToken !== user?.refreshToken) {
        throw new apiError(401, "Refresh token is expired or used")
    }

    const options = {
        httpOnly: true,
        secure: false  // Set to false for localhost development, true for production
    }
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new apiResponse(
                200,
                { accessToken, refreshToken },
                "Access token refreshed"
            )
        )
})
const changePassword = asyncHandler(async(req,res)=>{
    const {oldPassword, newPassword} = req.body
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if (!isPasswordCorrect) {
        throw new apiError(400,"Wrong password")
    }
    user.password = newPassword
    await user.save({validateBeforeSave:false})

    return res
    .status(200)
    .json(new apiResponse(200,{},"Password changed successfully"))
})

const getCurrentUser = asyncHandler(async(req,res) =>{
    return res 
    .status(200)
    .json(200,req.user,"current user fetched successfully")
})
const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullName, email} = req.body

    if (!fullName || !email) {
        throw new apiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email
            }
        },
        {new: true}
        
    ).select("-password")

    return res
    .status(200)
    .json(new apiResponse(200, user, "Account details updated successfully"))
});

const updateUserAvatar = asyncHandler(async (req,res)=>{
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new apiError(400,"Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url)
    {
        throw new apiError(400,"Error while uploading on avatar")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar : avatar.url
            }
        },
        {
            new : true
        }
    ).select("-password")

    return res 
    .status(200)
    .json(
        new apiResponse(200,user,"avatar updated successfully")
    )
})
const updateUserCoverImage = asyncHandler(async (req,res)=>{
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new apiError(400,"Cover image file is missing")
    }

    const avatar = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar.url)
    {
        throw new apiError(400,"Error while uploading on avatar")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage : coverImage.url
            }
        },
        {
            new:true
        }
    ).select("-password")

    return res 
    .status(200)
    .json(
        new apiResponse(200,user,"cover image updated successfully")
    )
})
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changePassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
}