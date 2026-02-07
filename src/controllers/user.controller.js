import { asyncHandler } from "../utils/asyncHandler.js";
import {apiError} from "../utils/apiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { apiResponse } from "../utils/apiResponse.js";
const registerUser = asyncHandler(async (req , res) =>{
    const {fullName,email,username,password} = req.body // get data from frontend(json/from)
    console.log("Email: ",email);
    // validation
    if(
        [fullName,email,username,password].some((field)=>{
            field.trim() === ""
        })
    ){
        throw new apiError(400, "All fields are required")
    }

    // already exist?
    const existedUser = User.findOne({
        $or: [{username},{email}]
    })
    if (existedUser) {
        throw new apiError(409, "User with email or username already exists")
    }

    // check for image and must avatar
    const avatarLocalPath = req.files?.avatar[0]?.path 
    const coverImageLocalPath = req.files?.coverImage[0]?.path 
    if(!avatarLocalPath)
    {
        throw new apiError(400,"Avatar is necessary")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar)
    {
        throw new apiError(500,"Avatar saving failed")
    }

    // make entry in db
    const user = User.create({
        fullName,
        avatar:avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
    })

    // check if user successfully created
    const createdUser = await User.findById("user.id").select(
        "-password -refreshToken"
    )
    if(!createdUser){
        throw new apiError(500,"User creation failed")
    }

    // return registered profile
    return res.status(401).json(
        new apiResponse(200,createdUser,"Profile creation successful")
    )
})

export {registerUser}