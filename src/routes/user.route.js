import { Router } from "express";
import {logoutUser, loginUser, registerUser, refreshAccessToken} from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";



const router = Router();


router.route("/register").post(upload.fields([
    {name: "avatar", maxCount: 1},
    {name: "coverImage", maxCount: 1}
]), 
registerUser)
router.route("/register").post(registerUser)

router.route("/login").post(loginUser);

//secure route
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);

// router.route("/test-auth").get(verifyJWT, (req, res) => {
//   res.status(200).json({
//     success: true,
//     message: "Access token is valid",
//     user: req.user,
//   });
// });

export default router;