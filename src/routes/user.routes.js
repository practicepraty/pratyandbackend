import express from "express";
import { registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { 
  loginUser, 
  logoutUser, 
  forgotPassword, 
  resetPassword, 
  verifyResetToken,
  getCurrentUser,
  updateUserProfile,
  changePassword,
  refreshAccessToken
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Registration route
router.post("/register", 
  upload.fields([
    {
      name: "profilePhoto",
      maxCount: 1,
    },
    {
      name: "cv",
      maxCount: 1,
    }
  ]),
  registerUser
);

// Authentication routes
router.route("/login").post(loginUser)

// Password recovery routes (public)
router.route("/forgot-password").post(forgotPassword)
router.route("/reset-password").post(resetPassword)
router.route("/verify-reset-token/:token").get(verifyResetToken)

// Secured routes
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/current-user").get(verifyJWT, getCurrentUser)
router.route("/update-profile").put(verifyJWT, updateUserProfile)
router.route("/change-password").post(verifyJWT, changePassword)
router.route("/refresh-token").post(refreshAccessToken)

export default router;