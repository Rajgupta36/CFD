import express from "express";
import { signin, verify, signup } from "../controller/user.js";
const router = express.Router();

router.post("/signin", signin);

router.get("/verify", verify);

router.post("/signup", signup);

export default router;
