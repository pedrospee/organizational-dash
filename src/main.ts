import { loadEnvironment } from "./infrastructure/config/environment.ts";

const environment = loadEnvironment();

console.log(`Personal Finance Manager started (${environment.NODE_ENV}).`);
