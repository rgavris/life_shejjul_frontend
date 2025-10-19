import "reflect-metadata";
import { DataSource } from "typeorm";
import express from "express";
import bcrypt from "bcrypt";
import { User } from "./entities/User";
import { Event } from "./entities/Event";
import { Contact } from "./entities/Contact";
import { UserService } from "./services/userService";
import { ContactService } from "./services/contactService";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: "localhost",
  port: 5432,
  database: "postgres",
  entities: [User, Event, Contact],
  synchronize: true, // for development: auto create database schema, no migrations
  logging: false,
});

async function main() {
  try {
    await AppDataSource.initialize();
    console.log("Data Source has been initialized!");

    const app = express();
    app.use(express.json());

    const userService = new UserService();
    const contactService = new ContactService();

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

        res.status(201).json(newUser);
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

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Error during Data Source initialization:", error);
  }
}

main();

// yarn dev
// curl http://localhost:3000/users
