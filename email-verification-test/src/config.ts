const dotenv=require("dotenv")
dotenv.config()
export const SENDER_USER = process.env.SENDER_USER
export const SENDER_PASSWORD = process.env.SENDER_PASSWORD
export const SENDER_PORT= process.env.SENDER_PORT
export const SENDER_HOST=process.env.SENDER_HOST
export const BASE_URL = "localhost:3001"
export const expiryTime = new Date(5*1000)