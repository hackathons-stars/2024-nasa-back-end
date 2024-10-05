import express, { Router } from "express";
import cors from "cors";

const app = express();

app.use(cors());

app.use(express.json())

const router = Router();

app.use(router);

app.listen(5000, () => {
  console.log("[Server]: http://localhost:5000");
});