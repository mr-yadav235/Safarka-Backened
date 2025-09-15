import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
// import YAML from "yamljs";
// import swaggerUi from "swagger-ui-express";

import authRoutes from "./routes/auth.routes.js";
import usersRoutes from "./routes/users.routes.js";
import captainsRoutes from "./routes/captains.routes.js";
import vehiclesRoutes from "./routes/vehicles.routes.js";
import ridesRoutes from "./routes/rides.routes.js";
import paymentsRoutes from "./routes/payments.routes.js";
import walletRoutes from "./routes/wallet.routes.js";
import promotionsRoutes from "./routes/promotions.routes.js";
import ratingsRoutes from "./routes/ratings.routes.js";
import supportRoutes from "./routes/support.routes.js";

const app = express();
app.use(helmet());
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
app.use(express.json());
app.use(morgan("dev"));

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

// Swagger/OpenAPI documentation disabled
// const swaggerDoc = YAML.load("openapi.yaml");
// app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));

app.use("/auth", authRoutes);
app.use("/users", usersRoutes);
app.use("/captains", captainsRoutes);
app.use("/vehicles", vehiclesRoutes);
app.use("/rides", ridesRoutes);
app.use("/payments", paymentsRoutes);
app.use("/wallet", walletRoutes);
app.use("/promotions", promotionsRoutes);
app.use("/ratings", ratingsRoutes);
app.use("/support", supportRoutes);

app.get("/health", (_, res) => res.json({ ok: true }));

export default app;