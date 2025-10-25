import request from "supertest";
import { createApp } from "../server";

describe("E2E Tests", () => {
  let app: any;

  beforeAll(async () => {
    app = createApp();
  });

  describe("Basic connectivity", () => {
    it("should connect to the server and get users endpoint", async () => {
      const response = await request(app).get("/users").expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe("POST /users", () => {
    it("should create a new user", async () => {
      const userData = {
        firstName: "John",
        lastName: "Doe",
        username: "johndoe",
        password: "password123",
      };

      const response = await request(app)
        .post("/users")
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body.firstName).toBe("John");
      expect(response.body.lastName).toBe("Doe");
      expect(response.body.username).toBe("johndoe");
      expect(response.body).not.toHaveProperty("password");
    });

    it("should return 400 for missing required fields", async () => {
      const incompleteData = {
        firstName: "John",
        lastName: "Doe",
      };

      await request(app).post("/users").send(incompleteData).expect(400);
    });

    it("should return 409 for duplicate username", async () => {
      const userData = {
        firstName: "Jane",
        lastName: "Smith",
        username: "janedoe",
        password: "password123",
      };

      await request(app).post("/users").send(userData).expect(201);

      await request(app).post("/users").send(userData).expect(409);
    });
  });

  describe("GET /contacts", () => {
    it("should get contacts endpoint", async () => {
      const response = await request(app)
        .get("/contacts")
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe("GET /getAllMyEvents", () => {
    it("should return 400 for missing userId", async () => {
      await request(app)
        .get("/getAllMyEvents")
        .expect(400);
    });

    it("should return 400 for invalid userId", async () => {
      await request(app)
        .get("/getAllMyEvents?userId=abc")
        .expect(400);
    });

    it("should return empty array for user with no events", async () => {
      const response = await request(app)
        .get("/getAllMyEvents?userId=999")
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });
  });
});
