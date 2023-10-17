import nodemailer from "nodemailer";
import {
  SENDER_USER,
  SENDER_HOST,
  SENDER_PASSWORD,
  SENDER_PORT,
  expiryTime,
} from "./config";
import express from "express";
import Mustache from "mustache";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import type { user } from "@prisma/client";
const transporter = nodemailer.createTransport({
  host: SENDER_HOST,
  port: SENDER_PORT,
  auth: {
    user: SENDER_USER,
    pass: SENDER_PASSWORD,
  },
  debug: true,
  tls: {
    rejectUnauthorized: false,
  },
});
const view = {
  title: "Joe",
  calc: () => 2 + 4,
};

const output = Mustache.render("{{title}} spends {{calc}}", view);
// Define email content
const mailOptions = {
  from: "nestor.wintheiser68@ethereal.email",
  to: "olga27@ethereal.email",
  subject: "Hello from Node.js",
  text: output,
};

interface Response {
  error: { message: String; data?: any } | undefined;
  data: any | undefined;
}
const prisma = new PrismaClient();
const app = express();
app.use(express.json());
app.get("/send", async (req, res) => {
  return res.send({ data: "A Ok!!" });
});
const hashFromUser = async (user: { username: string }) => {
  const currentTime = new Date();
  const hash = await bcrypt.hash(
    `${user.username} ${currentTime.toISOString()}`,
    10
  );
  const encodedHash = encodeURIComponent(hash);
  console.log("Hash", hash);
  console.log("Encoded hash", encodeURIComponent(hash));
  return encodedHash;
};
const slugify = (name: String) => {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "");
};
app.post("/user", async (req, res) => {
  const user = req.body.user;
  console.log("Body", req.body);
  const slug = slugify(user.username);
  const existingUser = await prisma.user.findFirst({
    where: {
      slug,
    },
  });
  if (existingUser) {
    return res.status(409).send({
      error: "Please choose a different name",
    });
  }
  const newUser = await prisma.user.create({
    data: {
      username: user.username,
      slug: slug,
    },
  });

  const hash = await hashFromUser(newUser);
  await prisma.verification.create({
    data: {
      hash,
      user: {
        connect: newUser,
      },
    },
  });
  return res.send({
    data: {
      message:
        "User created successfully. Imagine you're sent this hash in an email",
      hash,
    },
  });
});
app.get("/verify", (req, res) => {
  return res.status(400).send({
    error: {
      message: "Please provide hash",
    },
  });
});
app.get("/verify/:hash", async (req, res) => {
  let hash = req.params.hash;
  hash = encodeURIComponent(hash);
  // Get the required verification record
  const requiredVerification = await prisma.verification.findFirst({
    where: {
      hash,
    },
    include: {
      user: true,
    },
  });
  console.log(
    "All verifications: ",
    await prisma.verification.findMany({ select: { hash: true } })
  );
  if (!requiredVerification) {
    return res.status(404).send({
      error: {
        mesage: "Could not find verification key",
      },
    });
  }
  if (requiredVerification.user.verified) {
    return res.status(409).send({
      error: {
        message: "User already verified",
      },
    });
  }
  const currentTime = new Date().getTime();
  const verificationInitiationTime = requiredVerification.initiatedOn.getTime();
  const difference = currentTime - verificationInitiationTime;
  console.log("Time difference in seconds:", difference / 1000.0);
  if (difference > expiryTime.getTime()) {
    return res.status(403).send({
      error: {
        message:
          "Verification expired, please try to login to generate a new verification.",
      },
    });
  }
  // Verify the user. The try condition should not happen because user deletion cascades to verifications
  // But it does not hurt to be sure
  try {
    await prisma.user.update({
      where: {
        id: requiredVerification.userId,
      },
      data: {
        verified: true,
      },
    });
  } catch (e: any) {
    console.error(e);
    if (e.code && e.code === "P2025") {
      return res.status(404).send({
        error: {
          message: "Requested user not found",
        },
      });
    }
  }
  return res.send({ data: { message: "User verified" } });
});
app.post("/reverify", async (req, res) => {
  const { user } = req.body;
  const requiredUser = await prisma.user.findFirst({
    where: {
      username: user.username,
    },
  });
  if (!requiredUser) {
    return res.status(404).send({
      error: {
        message: "user not found",
      },
    });
  }
  if (requiredUser.verified) {
    return res.status(400).send({
      error: {
        message: "User already verified",
      },
    });
  }
  const hash = await hashFromUser(requiredUser);
  const requiredVerification = await prisma.verification.upsert({
    where: {
      userId: requiredUser.id,
    },
    update: {
      hash,
      initiatedOn: new Date(),
    },
    create: {
      hash,
      userId: requiredUser.id,
    },
  });
  return res.send({
    data:{
      message: "Successfully issued new verification",
      hash
    }
  })
});
app.listen(3001, () => {
  console.log("App listening");
});
