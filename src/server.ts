import "reflect-metadata";
import { DataSource } from "typeorm";
import express from "express";
import bcrypt from "bcrypt";
import { User } from "./entities/User";
import { Event } from "./entities/Event";
import { Contact } from "./entities/Contact";
import { UserService } from "./services/userService";
import { ContactService } from "./services/contactService";
import { EventService } from "./services/eventService";

export function createApp() {
  const app = express();
  app.use(express.json());

  const userService = new UserService();
  const contactService = new ContactService();
  const eventService = new EventService();

  app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    try {
      const user = await userService.findByUsername(username);
      if (!user) {
        res.status(401).json({ error: "Username not found" });
      } else if (await bcrypt.compare(password, user.password)) {
        res.json({ message: "Login successful", user });
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
    try {
      const users = await userService.findAll();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/contacts", async (req, res) => {
    try {
      const contacts = await contactService.findAll();
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contacts" });
    }
  });

  // TODO update when auth is added
  app.get("/getAllMyEvents", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid or missing userId" });
      }

      const events = await eventService.findByUserId(userId);

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

export const AppDataSource =
  process.env.NODE_ENV === "test"
    ? new DataSource({
        type: "postgres",
        host: "localhost",
        port: 5432,
        database: "life_schedule_test",
        entities: [User, Event, Contact],
        synchronize: true, // for development: auto create database schema, no migrations
        logging: false,
      })
    : new DataSource({
        type: "postgres",
        host: "localhost",
        port: 5432,
        database: "life_schedule",
        entities: [User, Event, Contact],
        synchronize: true, // for development: auto create database schema, no migrations
        logging: false,
      });
