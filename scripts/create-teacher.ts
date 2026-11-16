import "dotenv/config";
import * as readline from "node:readline";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth/password.server";

const ENTER_CHARS = new Set(["\n", "\r"]);
const CTRL_C = String.fromCharCode(3);
const BACKSPACE_CHARS = new Set([String.fromCharCode(127), "\b"]);

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    }),
  );
}

function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    let input = "";
    const onData = (char: string) => {
      if (ENTER_CHARS.has(char)) {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener("data", onData);
        process.stdout.write("\n");
        resolve(input);
        return;
      }
      if (char === CTRL_C) {
        process.exit(1);
      }
      if (BACKSPACE_CHARS.has(char)) {
        input = input.slice(0, -1);
        return;
      }
      input += char;
    };
    stdin.on("data", onData);
  });
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  console.log("Create the teacher (admin) account for the tuition tracker.\n");

  const email = (await ask("Email: ")).toLowerCase();
  if (!email.includes("@")) {
    console.error("Please enter a valid email address.");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.error(`An account with ${email} already exists.`);
    process.exit(1);
  }

  const password = await askHidden("Password (min 8 characters): ");
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const confirmPassword = await askHidden("Confirm password: ");
  if (password !== confirmPassword) {
    console.error("Passwords do not match.");
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.create({ data: { email, passwordHash, role: "TEACHER" } });

  console.log(`\nTeacher account created for ${email}. You can now log in at /login.`);
  await prisma.$disconnect();
}

main();
