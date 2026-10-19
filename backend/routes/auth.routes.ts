import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Prisma } from "../generated/prisma/client.ts";
import prisma from "../prisma.js";

const router = Router();

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.trim().length > 100 ||
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      email.trim().length > 255 ||
      typeof password !== "string" ||
      password.length < 8 ||
      password.length > 72
    ) {
      res.status(400).json({
        error: "Provide a valid name, email, and password between 8 and 72 characters",
      });
      return;
    }

    const user = await prisma.users.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password_hash: await bcrypt.hash(password, 12),
      },
      select: {
        id: true,
        name: true,
        email: true,
        created_at: true,
      },
    });

    res.status(201).json({ user });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      res.status(409).json({ error: "Email is already registered" });
      return;
    }

    console.error("Registration failed:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      res.status(400).json({
        error: "Email and password are required",
      });
      return;
    }

    const user = await prisma.users.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error("JWT_SECRET is missing");
      res.status(500).json({ error: "Server configuration error" });
      return;
    }

    const token = jwt.sign({}, jwtSecret, {
      subject: user.id,
      expiresIn: "1h",
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login failed:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

export default router;