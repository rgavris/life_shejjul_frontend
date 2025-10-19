import "reflect-metadata";
import { DataSource } from "typeorm";
import express from "express";
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
