"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nodemailer_1 = __importDefault(require("nodemailer"));
const config_1 = require("./config");
const express_1 = __importDefault(require("express"));
const mustache_1 = __importDefault(require("mustache"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_1 = require("@prisma/client");
const transporter = nodemailer_1.default.createTransport({
    host: config_1.SENDER_HOST,
    port: config_1.SENDER_PORT,
    auth: {
        user: config_1.SENDER_USER,
        pass: config_1.SENDER_PASSWORD,
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
const output = mustache_1.default.render("{{title}} spends {{calc}}", view);
// Define email content
const mailOptions = {
    from: "nestor.wintheiser68@ethereal.email",
    to: "olga27@ethereal.email",
    subject: "Hello from Node.js",
    text: output,
};
const prisma = new client_1.PrismaClient();
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.get("/send", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    return res.send({ data: "A Ok!!" });
}));
const hashFromUser = (user) => __awaiter(void 0, void 0, void 0, function* () {
    const currentTime = new Date();
    const hash = yield bcryptjs_1.default.hash(`${user.username} ${currentTime.toISOString()}`, 10);
    const encodedHash = encodeURIComponent(hash);
    console.log("Hash", hash);
    console.log("Encoded hash", encodeURIComponent(hash));
    return encodedHash;
});
const slugify = (name) => {
    return name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^\w-]+/g, "");
};
app.post("/user", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.body.user;
    console.log("Body", req.body);
    const slug = slugify(user.username);
    const existingUser = yield prisma.user.findFirst({
        where: {
            slug,
        },
    });
    if (existingUser) {
        return res.status(409).send({
            error: "Please choose a different name",
        });
    }
    const newUser = yield prisma.user.create({
        data: {
            username: user.username,
            slug: slug,
        },
    });
    const hash = yield hashFromUser(newUser);
    yield prisma.verification.create({
        data: {
            hash,
            user: {
                connect: newUser,
            },
        },
    });
    return res.send({
        data: {
            message: "User created successfully. Imagine you're sent this hash in an email",
            hash,
        },
    });
}));
app.get("/verify", (req, res) => {
    return res.status(400).send({
        error: {
            message: "Please provide hash",
        },
    });
});
app.get("/verify/:hash", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let hash = req.params.hash;
    hash = encodeURIComponent(hash);
    // Get the required verification record
    const requiredVerification = yield prisma.verification.findFirst({
        where: {
            hash,
        },
        include: {
            user: true,
        },
    });
    console.log("All verifications: ", yield prisma.verification.findMany({ select: { hash: true } }));
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
    if (difference > config_1.expiryTime.getTime()) {
        return res.status(403).send({
            error: {
                message: "Verification expired, please try to login to generate a new verification.",
            },
        });
    }
    // Verify the user. The try condition should not happen because user deletion cascades to verifications
    // But it does not hurt to be sure
    try {
        yield prisma.user.update({
            where: {
                id: requiredVerification.userId,
            },
            data: {
                verified: true,
            },
        });
    }
    catch (e) {
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
}));
app.post("/reverify", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { user } = req.body;
    const requiredUser = yield prisma.user.findFirst({
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
    const hash = yield hashFromUser(requiredUser);
    const requiredVerification = yield prisma.verification.upsert({
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
        data: {
            message: "Successfully issued new verification",
            hash
        }
    });
}));
app.listen(3001, () => {
    console.log("App listening");
});
