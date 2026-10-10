
import asyncHandler from "../utils/asynchandler.js";
import ApiError from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import apiResponse from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access and refresh token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
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

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  // const avatarLocalPath = req.file?.avatar[0]?.path;
  // const CoverImageLocalPath = req.file?.coverImage[0]?.path;
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

// console.log("Uploaded files:", req.files);
// console.log("Avatar path:", avatarLocalPath);

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar image is required");
  }

  // const avatar = await uploadOnCloudinary(avatarLocalPath);
  // const coverImage = await uploadOnCloudinary(CoverImageLocalPath);
  const avatar = await uploadOnCloudinary(avatarLocalPath);

const coverImage = coverImageLocalPath
  ? await uploadOnCloudinary(coverImageLocalPath)
  : null;

  if (!avatar) {
    throw new ApiError(400, "Avatar image is required");
  }

  const user = await User.create({
    fullName,
    email,
    password,
    username: username.toLowerCase(),
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

const loginUser = asyncHandler(async (req, res) => {
  //req body -> data
  // username or email
  // find the user
  // password check
  // access and refresh token
  // send cokie

  const { email, username, password } = req.body;

  if (!email || !username) {
    throw new ApiError(400, "Email or username is required");
  }

  const user = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid password");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = User.findById(user._id).select(
    "-password -refreshToken"
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new apiResponse(200, {
        user: loggedInUser,
        accessToken,
        refreshToken,
      }, "User logged in successfully")
    ); 
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set:{
        refreshToken: undefined
      }
    }
  )

   const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new apiResponse(200, {}, "User logged out successfully"));


})

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

  if(incomingRefreshToken){
    throw new ApiError(401, "Unauthorized request")
  }

  try{
    const decodedToken = jwt.verify(
    incomingRefreshToken,
    process.env.REFRESH_TOKEN_SECRET,
  )

  const user = await User.findById(decodedToken?._id)

  if(!user) {
    throw new ApiError(401, "Invalid referesh token")
  }

  if(incomingRefreshToken !== user?.refreshToken){
    throw new ApiError(401, "Refresh token is expired or used")
  }


  // this will generate new access and refresh token and save the new refresh token in the db
  const options = {
    httpOnly: true,
    secure: true,
  }

 const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id)

 return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new apiResponse(
        200,
        { accessToken, refreshToken: newRefreshToken},
        "Access token refreshed successfully"
      )
    )
  } catch(error){
    throw new ApiError(401, error?.message || "Invalid refresh token")
  }

})

export { registerUser, loginUser, logoutUser, refreshAccessToken };




// import asyncHandler from "../utils/asynchandler.js";
// import ApiError from "../utils/ApiError.js";
// import { User } from "../models/user.model.js";
// import apiResponse from "../utils/ApiResponse.js";

// // Generate access token and refresh token
// const generateAccessAndRefreshToken = async (userId) => {
//   try {
//     const user = await User.findById(userId);

//     if (!user) {
//       throw new ApiError(404, "User does not exist");
//     }

//     const accessToken = user.generateAccessToken();
//     const refreshToken = user.generateRefreshToken();

//     user.refreshToken = refreshToken;

//     await user.save({ validateBeforeSave: false });

//     return { accessToken, refreshToken };
//   } catch (error) {
//     if (error instanceof ApiError) {
//       throw error;
//     }

//     throw new ApiError(
//       500,
//       "Something went wrong while generating access and refresh token"
//     );
//   }
// };

// // Register user
// const registerUser = asyncHandler(async (req, res) => {
//   const { fullName, username, email, password } = req.body;

//   // Validate required fields
//   if (
//     [fullName, username, email, password].some(
//       (field) => !field || field.trim() === ""
//     )
//   ) {
//     throw new ApiError(400, "All fields are required");
//   }

//   // Normalize input
//   const normalizedUsername = username.trim().toLowerCase();
//   const normalizedEmail = email.trim().toLowerCase();
//   const normalizedFullName = fullName.trim();

//   // Check whether user already exists
//   const existedUser = await User.findOne({
//     $or: [
//       { username: normalizedUsername },
//       { email: normalizedEmail },
//     ],
//   });

//   if (existedUser) {
//     throw new ApiError(
//       409,
//       "User with email or username already exists"
//     );
//   }

//   // Create user without avatar or cover image
//   const user = await User.create({
//     fullname: normalizedFullName,
//     username: normalizedUsername,
//     email: normalizedEmail,
//     password,
//   });

//   // Exclude sensitive fields from response
//   const createdUser = await User.findById(user._id).select(
//     "-password -refreshToken"
//   );

//   if (!createdUser) {
//     throw new ApiError(
//       500,
//       "Something went wrong while registering the user"
//     );
//   }

//   return res.status(201).json(
//     new apiResponse(
//       201,
//       createdUser,
//       "User registered successfully"
//     )
//   );
// });

// // Login user
// const loginUser = asyncHandler(async (req, res) => {
//   const { email, username, password } = req.body;

//   // Require email or username
//   if (
//     (!email || email.trim() === "") &&
//     (!username || username.trim() === "")
//   ) {
//     throw new ApiError(400, "Email or username is required");
//   }

//   // Require password
//   if (!password || password.trim() === "") {
//     throw new ApiError(400, "Password is required");
//   }

//   // Build the query using the supplied email or username
//   const conditions = [];

//   if (email && email.trim() !== "") {
//     conditions.push({ email: email.trim().toLowerCase() });
//   }

//   if (username && username.trim() !== "") {
//     conditions.push({ username: username.trim().toLowerCase() });
//   }

//   const user = await User.findOne({
//     $or: conditions,
//   });

//   if (!user) {
//     throw new ApiError(404, "User does not exist");
//   }

//   // Verify password
//   const isPasswordValid = await user.isPasswordCorrect(password);

//   if (!isPasswordValid) {
//     throw new ApiError(401, "Invalid password");
//   }

//   // Generate tokens
//   const { accessToken, refreshToken } =
//     await generateAccessAndRefreshToken(user._id);

//   // Get user details without sensitive fields
//   const loggedInUser = await User.findById(user._id).select(
//     "-password -refreshToken"
//   );

//   const options = {
//     httpOnly: true,
//     secure: true,
//   };

//   // Send response
//   return res
//     .status(200)
//     .cookie("accessToken", accessToken, options)
//     .cookie("refreshToken", refreshToken, options)
//     .json(
//       new apiResponse(
//         200,
//         {
//           user: loggedInUser,
//           accessToken,
//           refreshToken,
//         },
//         "User logged in successfully"
//       )
//     );
// });

// // Logout user
// const logoutUser = asyncHandler(async (req, res) => {
//   if (!req.user?._id) {
//     throw new ApiError(401, "User is not authenticated");
//   }

//   await User.findByIdAndUpdate(req.user._id, {
//     $unset: {
//       refreshToken: 1,
//     },
//   });

//   const options = {
//     httpOnly: true,
//     secure: true,
//   };

//   return res
//     .status(200)
//     .clearCookie("accessToken", options)
//     .clearCookie("refreshToken", options)
//     .json(
//       new apiResponse(
//         200,
//         {},
//         "User logged out successfully"
//       )
//     );
// });

// const getUserByEmail = asyncHandler(async (req, res) => {
//   const { email } = req.body;

//   if (!email) {
//     throw new ApiError(400, "Email is required");
//   }

//   const user = await User.findOne({ email }).select(
//     "-password -refreshToken"
//   );

//   if (!user) {
//     throw new ApiError(404, "User not found");
//   }

//   return res.status(200).json({
//     success: true,
//     message: "User found successfully",
//     data: user,
//   });
// });


// export { registerUser, loginUser, logoutUser, getUserByEmail };
