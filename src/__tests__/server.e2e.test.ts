import request from "supertest";
import { createApp } from "../server";
import { testDataSource } from "./setup";

describe("E2E Tests", () => {
  let app: any;

  beforeAll(async () => {
    app = createApp(testDataSource);
  });

  describe("GET /users", () => {
    it("should return 401 without auth token", async () => {
      await request(app).get("/users").expect(401);
    });

    it("should get users with valid auth token", async () => {
      // First create a user and login
      const userData = {
        firstName: "Test",
        lastName: "User",
        username: "testuser",
        password: "password123",
      };
      await request(app).post("/users").send(userData).expect(201);

      const loginResponse = await request(app)
        .post("/login")
        .send({ username: "testuser", password: "password123" })
        .expect(200);

      const token = loginResponse.body.token;

      const response = await request(app)
        .get("/users")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

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
    it("should return 401 without auth token", async () => {
      await request(app).get("/contacts").expect(401);
    });

    it("should get contacts with valid auth token", async () => {
      // First create a user and login
      const userData = {
        firstName: "Test",
        lastName: "User",
        username: "testuser",
        password: "password123",
      };
      await request(app).post("/users").send(userData).expect(201);

      const loginResponse = await request(app)
        .post("/login")
        .send({ username: "testuser", password: "password123" })
        .expect(200);

      const token = loginResponse.body.token;

      const response = await request(app)
        .get("/contacts")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    describe("User-specific contact filtering", () => {
      it("should return only John Doe's contacts when John is logged in", async () => {
        // Create John Doe user
        const johnData = {
          firstName: "John",
          lastName: "Doe",
          username: "johndoe",
          password: "password123",
        };
        const johnResponse = await request(app)
          .post("/users")
          .send(johnData)
          .expect(201);
        const johnId = johnResponse.body.id;

        const johnLoginResponse = await request(app)
          .post("/login")
          .send({ username: "johndoe", password: "password123" })
          .expect(200);
        const johnToken = johnLoginResponse.body.token;

        // Create Jane Doe user
        const janeData = {
          firstName: "Jane",
          lastName: "Doe",
          username: "janedoe",
          password: "password123",
        };
        const janeResponse = await request(app)
          .post("/users")
          .send(janeData)
          .expect(201);

        const janeId = janeResponse.body.id;

        const janeLoginResponse = await request(app)
          .post("/login")
          .send({ username: "janedoe", password: "password123" })
          .expect(200);
        const janeToken = janeLoginResponse.body.token;

        const createContactRequest = async (
          contactData: any,
          token: string,
        ) => {
          return request(app)
            .post("/contacts")
            .set("Authorization", `Bearer ${token}`)
            .send(contactData)
            .expect(201);
        };

        // Create John's contacts: Billy Bob, Granny Smith
        await createContactRequest(
          {
            firstName: "Billy",
            lastName: "Bob",
            email: "billy.bob@example.com",
            phoneNumber: "555-0001",
            userId: johnId,
          },
          johnToken,
        );

        createContactRequest(
          {
            firstName: "Granny",
            lastName: "Smith",
            email: "granny.smith@example.com",
            phoneNumber: "555-0002",
            userId: johnId,
          },
          johnToken,
        );

        // Create Jane's contacts: Charlie Brown, Lucy Van Pelt
        createContactRequest(
          {
            firstName: "Charlie",
            lastName: "Brown",
            email: "charlie.brown@example.com",
            phoneNumber: "555-0003",
            userId: janeId,
          },
          janeToken,
        );

        createContactRequest(
          {
            firstName: "Lucy",
            lastName: "Van Pelt",
            email: "lucy.vanpelt@example.com",
            phoneNumber: "555-0004",
            userId: janeId,
          },
          janeToken,
        );

        // Get John's contacts
        const response = await request(app)
          .get("/contacts")
          .set("Authorization", `Bearer ${johnToken}`)
          .expect(200);

        expect(response.body).toHaveLength(2);
        expect(
          response.body.map((c: any) => `${c.firstName} ${c.lastName}`),
        ).toEqual(expect.arrayContaining(["Billy Bob", "Granny Smith"]));
        expect(
          response.body.map((c: any) => `${c.firstName} ${c.lastName}`),
        ).not.toEqual(
          expect.arrayContaining(["Charlie Brown", "Lucy Van Pelt"]),
        );
      });

      it("should return empty array when user has no contacts", async () => {
        // Create user with no contacts
        const userData = {
          firstName: "Empty",
          lastName: "User",
          username: "emptyuser",
          password: "password123",
        };
        await request(app).post("/users").send(userData).expect(201);

        const loginResponse = await request(app)
          .post("/login")
          .send({ username: "emptyuser", password: "password123" })
          .expect(200);

        const response = await request(app)
          .get("/contacts")
          .set("Authorization", `Bearer ${loginResponse.body.token}`)
          .expect(200);

        expect(response.body).toHaveLength(0);
        expect(Array.isArray(response.body)).toBe(true);
      });
    });
  });

  describe("GET /getAllMyEvents", () => {
    it("should return 401 without auth token", async () => {
      await request(app).get("/getAllMyEvents").expect(401);
    });

    it("should return empty array for authenticated user with no events", async () => {
      // Create user and login
      const userData = {
        firstName: "Test",
        lastName: "User",
        username: "testuser",
        password: "password123",
      };
      await request(app).post("/users").send(userData).expect(201);

      const loginResponse = await request(app)
        .post("/login")
        .send({ username: "testuser", password: "password123" })
        .expect(200);

      const token = loginResponse.body.token;

      const response = await request(app)
        .get("/getAllMyEvents")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });
  });
});
