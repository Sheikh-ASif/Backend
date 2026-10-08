import asynchandler from "../utils/asynchandler.js";
import ApiError from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import apiResponse from "../utils/ApiResponse.js";

const registerUser = asynchandler(async (req, res) => {
  //get user details from frontend
  // validation - not empty
  // check if user already exists: email, username
  //check for images, for avatar
  // upload image to cloudinary
  // create user object- create user in db
  // remove password aand refresh token from response
  // check for user creation
  // return response

  const { fullName, username, email, password } = req.body;
  console.log(email);

  // this is also a way to validate the fields,
  //   if(fullName || username || email || password){
  //     throw new APIError(400, "All fields are required")
  //   }

  //this is the validation part of the code, for only the fullName field,
  //   if(!fullName ==="") {
  //     throw new APIError(400, "FullName is required")
  //   }

  
  if (
    [fullName, username, email, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  const avatarLocalPath = req.file?.avatar[0]?.path;
  const CoverImageLocalPath = req.file?.coverImage[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar image is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(CoverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar image is required");
  }

  const user = await User.create({
    fullName,
    email,
    password,
    username: username.lowerCase(),
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user ");
  }

  return res
    .status(201)
    .json(new apiResponse(200, createdUser, "User registered successfully"));
});

export default registerUser;
