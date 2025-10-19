import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "./entities/User";
import { Event } from "./entities/Event";
import { Contact } from "./entities/Contact";

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
    
    // open the database connection
    // listen for API requests
    // set up routes
    // e.g. /getUsers, /createEvent, etc.
    // /sendEventInvitation
    // and those routes will use the AppDataSource to interact with the database
  } catch (error) {
    console.error("Error during Data Source initialization:", error);
  }
}

main();
