import type { Request, Response } from "express";
import { prisma } from "../manager/db.js";
import { sendmail } from "../services/mail.js";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const magicLinks: {
  token: string;
  email: string;
  hashedPassword?: string;
}[] = [];
const JWT_SECRET = process.env.JWT_SECRET || "secret";

export async function signin(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    if (!email) return res.status(400).json({ error: "Email not provided" });

    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const authToken = jwt.sign(
        { email: user.email, id: user.id },
        JWT_SECRET,
        { expiresIn: "7d" },
      );

      res
        .status(200)
        .cookie("AuthToken", authToken, { httpOnly: true, secure: true })
        .json({ message: "Logged in successfully" });
      return;
    }

    if (!password)
      return res
        .status(400)
        .json({ error: "Password required for new user registration" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const token = uuidv4();
    magicLinks.push({
      token,
      email,
      hashedPassword,
    });

    await sendmail(
      email,
      `http://localhost:3000/api/v1/user/verify?token=${token}`,
    );

    res.status(200).json({ message: "Magic link sent to your email" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function verify(req: Request, res: Response) {
  try {
    const { token } = req.query;
    if (!token || typeof token !== "string")
      return res.status(400).json({ error: "Token is required" });

    const index = magicLinks.findIndex((t) => t.token === token);
    if (index === -1) return res.status(400).json({ error: "Invalid token" });

    const record = magicLinks[index];
    magicLinks.splice(index, 1);

    if (!record || !record.email || !record.hashedPassword) {
      return res.status(400).json({
        msg: "we dont have data",
      });
    }

    let user = await prisma.user.findUnique({ where: { email: record.email } });
    if (!user) {
      if (!record.hashedPassword)
        return res
          .status(400)
          .json({ error: "No password provided for new user" });

      user = await prisma.user.create({
        data: {
          email: record.email,
          password: record.hashedPassword,
        },
      });
    }

    const authToken = jwt.sign({ email: user.email, id: user.id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res
      .status(200)
      .cookie("AuthToken", authToken, { httpOnly: true, secure: true })
      .json({ message: "User verified successfully" });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: "Something went wrong" });
  }
}
