import { loadEnvironment } from "./infrastructure/config/environment.ts";

const environment = loadEnvironment();

console.log(`Solvia started (${environment.NODE_ENV}).`);
