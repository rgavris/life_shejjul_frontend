import "reflect-metadata";
import { DataSource } from "typeorm";
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "./entities/User";
import { Event } from "./entities/Event";
import { Contact } from "./entities/Contact";
import { UserService } from "./services/userService";
import { ContactService } from "./services/contactService";
import { EventService } from "./services/eventService";

export function createApp(dataSource: DataSource) {
  const app = express();
  app.use(express.json());

  const userService = new UserService(dataSource);
  const contactService = new ContactService(dataSource);
  const eventService = new EventService(dataSource);

  const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

  const verifyAuth = (req: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return { success: false, error: "No token provided" };
    }

    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      return { success: true, user: decoded };
    } catch (error) {
      return { success: false, error: "Invalid token" };
    }
  };

  app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    try {
      const user = await userService.findByUsername(username);
      if (!user) {
        res.status(401).json({ error: "Username not found" });
      } else if (await bcrypt.compare(password, user.password)) {
        const { password, ...userWithoutPassword } = user;
        const token = jwt.sign(
          { userId: user.id, username: user.username },
          JWT_SECRET,
          { expiresIn: "24h" },
        );
        res.json({
          message: "Login successful",
          token,
          user: userWithoutPassword,
        });
      } else {
        res.status(401).json({ error: "Invalid password" });
      }
    } catch (error) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/users", async (req, res) => {
    try {
      const { firstName, lastName, username, password } = req.body;

      if (!firstName || !lastName || !username || !password) {
        return res.status(400).json({
          error:
            "Missing required fields: firstName, lastName, username, password",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await userService.create({
        firstName,
        lastName,
        username,
        password: hashedPassword,
      });

      res.status(201).json({
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        username: newUser.username,
        id: newUser.id,
      });
    } catch (error: any) {
      if (error.code === "23505") {
        res.status(409).json({ error: "Username already exists" });
      } else {
        res.status(500).json({ error: "Failed to create user" });
      }
    }
  });

  app.get("/users", async (req, res) => {
    const auth = verifyAuth(req);
    if (!auth.success) {
      return res.status(401).json({ error: auth.error });
    }

    try {
      const users = await userService.findAll();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/contacts", async (req, res) => {
    const auth = verifyAuth(req);
    if (!auth.success) {
      return res.status(401).json({ error: auth.error });
    }

    try {
      const contacts = await contactService.findAll();
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contacts" });
    }
  });

  app.get("/getAllMyEvents", async (req, res) => {
    const { success, user, error } = verifyAuth(req);

    if (!success) {
      return res.status(401).json({ error: error });
    }

    try {
      const events = await eventService.findByUserId(user.userId);

      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });
  // figure out the DB logic
  // update DB schema as necessary
  // add more endpoints as necessary
  // add tests/client usage

  return app;
}

export const AppDataSource = new DataSource({
  type: "postgres",
  host: "localhost",
  port: 5432,
  database: "life_schedule",
  entities: [User, Event, Contact],
  synchronize: true, // for development: auto create database schema, no migrations
  logging: false,
});

// My complaint:
// we had to figure out server.e2e.test.ts
// then setup.ts
// and then see: where do we make the db?
// it would be better to have the test db made in the test file
// one solution: remove redunant code
