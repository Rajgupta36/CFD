import express from "express";
import { signin, verify } from "../controller/user.js";
const router = express.Router();

router.post("/signin", signin);

router.get("/verify", verify);

export default router;
