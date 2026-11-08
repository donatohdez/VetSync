import express, { type Express } from 'express';
import type { Pool } from 'mysql2/promise';
import type { Clock } from './shared/clock.js';
export function buildApplication(_pool: Pool, _clock: Clock, _options: {timeZone:string; reminderHours:number}): Express {
 const app = express();
 app.use((_req,res)=>{res.status(501).json({error:{code:'NOT_IMPLEMENTED'}});});
 return app;
}
