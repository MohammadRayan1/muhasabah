"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, deleteSession } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new Error("Invalid email or password");
  }

  await createSession(user.id, user.role);
  redirect(user.role === "TEACHER" ? "/" : "/portal");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}

export async function acceptInvite(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!token) throw new Error("Missing invite token");
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }
  if (password !== confirmPassword) {
    throw new Error("Passwords do not match");
  }

  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    throw new Error("This invite link is invalid or has expired");
  }

  const existingUser = await prisma.user.findUnique({ where: { email: invite.email } });
  if (existingUser) {
    throw new Error("An account with this email already exists. Log in instead.");
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        email: invite.email,
        passwordHash,
        role: "MEMBER",
        studentId: invite.studentId,
      },
    });
    await tx.invite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
    return createdUser;
  });

  await createSession(user.id, user.role);
  redirect("/portal");
}
