import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "../entities/User";
import { Event } from "../entities/Event";
import { Contact } from "../entities/Contact";
import { EventInvitation } from "../entities/EventInvitation";

const workerId = process.env.JEST_WORKER_ID || "1";
const schemaName = `test_worker_${workerId}`;

async function createTestDatabase() {
  const adminDataSource = new DataSource({
    type: "postgres",
    host: "localhost",
    port: 5432,
    database: "postgres",
    username: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD,
  });

  try {
    await adminDataSource.initialize();
    await adminDataSource.query(`CREATE DATABASE "life_schedule_test"`);
    console.log("Test database created");
  } catch (error: any) {
    if (error.code !== "42P04") {
      console.error("Error creating test database:", error);
    }
  } finally {
    await adminDataSource.destroy();
  }
}

// new DataSource will connect but can't create the db
export const testDataSource = new DataSource({
  type: "postgres",
  host: "localhost",
  port: 5432,
  database: "life_schedule_test",
  schema: schemaName,
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD,
  entities: [User, Event, Contact, EventInvitation],
  synchronize: false,
  logging: false,
});

beforeAll(async () => {
  await createTestDatabase();

  // Initialize without synchronize first
  await testDataSource.initialize();

  // Create the schema for this worker
  await testDataSource.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);

  // Now manually synchronize to create tables in the schema
  await testDataSource.synchronize();
});

afterAll(async () => {
  // Clean up the schema for this worker
  await testDataSource.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`);
  await testDataSource.destroy();
});

beforeEach(async () => {
  // Delete in order to respect foreign key constraints
  // EventInvitation references Event and Contact
  // Event references User and Contact
  // Contact references User
  await testDataSource.getRepository(EventInvitation).createQueryBuilder().delete().execute();
  await testDataSource.getRepository(Event).createQueryBuilder().delete().execute();
  await testDataSource.getRepository(Contact).createQueryBuilder().delete().execute();
  await testDataSource.getRepository(User).createQueryBuilder().delete().execute();
});
