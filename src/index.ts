import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "./entities/User";
import { Event } from "./entities/Event";
import { Contact } from "./entities/Contact";

const AppDataSource = new DataSource({
  type: "postgres",
  host: "localhost",
  port: 5432,
  database: "postgres",
  entities: [User, Event, Contact],
  synchronize: true,
  logging: false,
});

async function main() {
  try {
    await AppDataSource.initialize();
    console.log("Data Source has been initialized!");
    
    const userRepository = AppDataSource.getRepository(User);
    
    // Example usage
    const user = new User();
    user.firstName = "John";
    user.lastName = "Doe";
    user.age = 25;
    
    await userRepository.save(user);
    console.log("User saved:", user);
    
  } catch (error) {
    console.error("Error during Data Source initialization:", error);
  }
}

main();