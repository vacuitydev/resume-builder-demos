var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import nodemailer from "nodemailer";
import { SENDER_USER, SENDER_HOST, SENDER_PASSWORD, SENDER_PORT, } from "./config.js";
import express from "express";
import Mustache from "mustache";
import bodyParser from "body-parser";
import { PrismaClient } from "@prisma/client";
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
const prisma = new PrismaClient();
const app = express();
app.use(bodyParser.json());
app.get("/send", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield transporter.sendMail;
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error("Error sending email:", error);
        }
        else {
            console.log("Email sent:", info.response);
        }
    });
}));
const slugFromUser = (user) => {
    const slug = user.username;
};
app.post("/user", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.query.user;
    const slug = slugFromUser(user);
}));
app.listen(3001, () => {
    console.log("App listening");
});
