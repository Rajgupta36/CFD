import type { Request, Response } from "express";
import { prisma } from "../manager/db.js";
import { sendmail } from "../services/mail.js";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const magicLinks: { token: string; email: string; hashedPassword?: string }[] =
  [];
const JWT_SECRET = process.env.JWT_SECRET || "secret";

export async function signup(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);
    const token = uuidv4();
    magicLinks.push({ token, email, hashedPassword });

    await sendmail(
      email,
      `http://localhost:3000/api/v1/user/verify?token=${token}`,
    );

    console.log("signup: mail sent");
    res.json({ msg: "mail sent" });
  } catch (err) {
    console.log("signup error", err);
    res.status(500).json({ error: "signup error" });
  }
}

export async function verify(req: Request, res: Response) {
  try {
    const { token } = req.query;
    const index = magicLinks.findIndex((t) => t.token === token);
    const record = magicLinks[index];
    magicLinks.splice(index, 1);

    let user = await prisma.user.findUnique({
      where: { email: record?.email! },
    });
    if (!user) {
      user = await prisma.user.create({
        data: { email: record?.email!, password: record?.hashedPassword! },
      });
    }

    const authToken = jwt.sign({ email: user.email, id: user.id }, JWT_SECRET, {
      expiresIn: "7d",
    });
    console.log("verify: user created");
    res.cookie("authorization", authToken).json({ msg: "user verified" });
  } catch (err) {
    console.log("verify error", err);
    res.status(500).json({ error: "verify error" });
  }
}

export async function signin(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    const valid = user && (await bcrypt.compare(password, user?.password!));

    if (!user || !valid)
      return res.status(401).json({ error: "invalid credentials" });

    const authToken = jwt.sign({ email: user.email, id: user.id }, JWT_SECRET, {
      expiresIn: "7d",
    });
    console.log("signin: success");
    res
      .cookie("authorization", authToken)
      .cookie("email", email)
      .json({ msg: "success" });
  } catch (err) {
    console.log("signin error", err);
    res.status(500).json({ error: "signin error" });
  }
}
