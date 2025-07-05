import express from "express";
import { registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { loginUser, logoutUser } from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

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

router.route("/login").post(loginUser)

//secured routes
router.route("/logout").post(verifyJWT,  logoutUser)

export default router;