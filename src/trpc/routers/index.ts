import { customAlphabet } from "nanoid";
import { createTRPCRouter } from "../init";
import { registerDevice } from "./src/registerDevice";
import { createWorkflow } from "./src/createWorkflow";
import { executeWorkflow } from "./src/executeWorkflow.ts";
import { getServerWallet } from "./src/getServerWallet";
import { greenfield } from "./src/greenfield";
import { getWorkflow } from "./src/getWorkflow";
import { joinWorkflow } from "./src/joinWorkflow";

export const appRouter = createTRPCRouter({
  createWorkflow,
  registerDevice,
  joinWorkflow,
  executeWorkflow,
  getServerWallet,
  greenfield,
  getWorkflow,
});

export type AppRouter = typeof appRouter;
