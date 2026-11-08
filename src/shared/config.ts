import "dotenv/config";
import { environmentSchema } from "./environment.js";
export const config = environmentSchema.parse(process.env);
