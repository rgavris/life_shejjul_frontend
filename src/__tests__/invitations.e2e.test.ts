import request from "supertest";
import { createApp } from "../server";
import { testDataSource } from "./setup";
import { RSVPStatus } from "../entities/EventInvitation";

describe("Event Invitations E2E Tests", () => {
  let app: any;
  let authToken: string;
  let userId: number;
  let contact1Id: number;
  let contact2Id: number;
  let contact3Id: number;

  beforeAll(async () => {
    app = createApp(testDataSource);
  });

  beforeEach(async () => {
    // Create a user and get auth token
    const userData = {
      firstName: "Test",
      lastName: "User",
      username: `testuser${Date.now()}`,
      password: "password123",
    };

    const userResponse = await request(app)
      .post("/users")
      .send(userData)
      .expect(201);

    userId = userResponse.body.id;

    const loginResponse = await request(app)
      .post("/login")
      .send({ username: userData.username, password: "password123" })
      .expect(200);

    authToken = loginResponse.body.token;

    // Create test contacts
    const contact1Response = await request(app)
      .post("/contacts")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phoneNumber: "555-0001",
        userId: userId,
        birthMonth: 5,
        birthDay: 15,
      })
      .expect(201);
    contact1Id = contact1Response.body.id;

    const contact2Response = await request(app)
      .post("/contacts")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        phoneNumber: "555-0002",
        userId: userId,
        birthMonth: 8,
        birthDay: 20,
      })
      .expect(201);
    contact2Id = contact2Response.body.id;

    const contact3Response = await request(app)
      .post("/contacts")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        firstName: "Bob",
        lastName: "Johnson",
        email: "bob@example.com",
        phoneNumber: "555-0003",
        userId: userId,
      })
      .expect(201);
    contact3Id = contact3Response.body.id;
  });

  describe("POST /events - Create event with invitations", () => {
    it("should create an event with invitations", async () => {
      const eventData = {
        name: "Birthday Party",
        address: "123 Main St",
        time: new Date("2025-12-25T18:00:00Z").toISOString(),
        contactIds: [contact1Id, contact2Id],
      };

      const response = await request(app)
        .post("/events")
        .set("Authorization", `Bearer ${authToken}`)
        .send(eventData);

      if (response.status !== 201) {
        console.error("Error creating event:", response.body);
      }
      expect(response.status).toBe(201);

      expect(response.body).toHaveProperty("event");
      expect(response.body).toHaveProperty("invitations");
      expect(response.body).toHaveProperty("invitationCount");
      expect(response.body.event.name).toBe("Birthday Party");
      expect(response.body.invitations).toHaveLength(2);
      expect(response.body.invitationCount).toBe(2);

      // Check invitation details
      const invitation1 = response.body.invitations[0];
      expect(invitation1).toHaveProperty("eventId");
      expect(invitation1).toHaveProperty("contactId");
      expect(invitation1.rsvpStatus).toBe(RSVPStatus.PENDING);
    });

    it("should create an event without invitations", async () => {
      const eventData = {
        name: "Solo Event",
        address: "456 Oak Ave",
        time: new Date("2025-12-31T20:00:00Z").toISOString(),
      };

      const response = await request(app)
        .post("/events")
        .set("Authorization", `Bearer ${authToken}`)
        .send(eventData)
        .expect(201);

      expect(response.body.event.name).toBe("Solo Event");
      expect(response.body.invitations).toHaveLength(0);
      expect(response.body.invitationCount).toBe(0);
    });

    it("should return 400 for missing required fields", async () => {
      const incompleteData = {
        name: "Incomplete Event",
      };

      await request(app)
        .post("/events")
        .set("Authorization", `Bearer ${authToken}`)
        .send(incompleteData)
        .expect(400);
    });

    it("should return 401 without auth token", async () => {
      const eventData = {
        name: "Unauthorized Event",
        address: "789 Elm St",
        time: new Date("2025-12-25T18:00:00Z").toISOString(),
      };

      await request(app).post("/events").send(eventData).expect(401);
    });

    it("should return 400 when contactId doesn't belong to user", async () => {
      // Create another user's contact
      const otherUserData = {
        firstName: "Other",
        lastName: "User",
        username: `otheruser${Date.now()}`,
        password: "password123",
      };

      const otherUserResponse = await request(app)
        .post("/users")
        .send(otherUserData)
        .expect(201);

      const otherLoginResponse = await request(app)
        .post("/login")
        .send({ username: otherUserData.username, password: "password123" })
        .expect(200);

      const otherContact = await request(app)
        .post("/contacts")
        .set("Authorization", `Bearer ${otherLoginResponse.body.token}`)
        .send({
          firstName: "Other",
          lastName: "Contact",
          email: "other@example.com",
          phoneNumber: "555-9999",
          userId: otherUserResponse.body.id,
        })
        .expect(201);

      // Try to create event with other user's contact
      const eventData = {
        name: "Invalid Event",
        address: "123 Main St",
        time: new Date("2025-12-25T18:00:00Z").toISOString(),
        contactIds: [otherContact.body.id],
      };

      await request(app)
        .post("/events")
        .set("Authorization", `Bearer ${authToken}`)
        .send(eventData)
        .expect(400);
    });
  });

  describe("POST /events/:eventId/invitations - Send invitations", () => {
    let eventId: number;

    beforeEach(async () => {
      // Create an event without invitations
      const eventData = {
        name: "Test Event",
        address: "123 Main St",
        time: new Date("2025-12-25T18:00:00Z").toISOString(),
      };

      const response = await request(app)
        .post("/events")
        .set("Authorization", `Bearer ${authToken}`)
        .send(eventData)
        .expect(201);

      eventId = response.body.event.id;
    });

    it("should send invitations to contacts", async () => {
      const response = await request(app)
        .post(`/events/${eventId}/invitations`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ contactIds: [contact1Id, contact2Id, contact3Id] })
        .expect(201);

      expect(response.body).toHaveProperty("message");
      expect(response.body).toHaveProperty("invitations");
      expect(response.body.invitations).toHaveLength(3);
      expect(response.body.count).toBe(3);
    });

    it("should not create duplicate invitations", async () => {
      // Send first batch
      await request(app)
        .post(`/events/${eventId}/invitations`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ contactIds: [contact1Id, contact2Id] })
        .expect(201);

      // Send second batch with overlapping contact
      const response = await request(app)
        .post(`/events/${eventId}/invitations`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ contactIds: [contact2Id, contact3Id] })
        .expect(201);

      // Should only create invitation for contact3
      expect(response.body.invitations).toHaveLength(1);
      expect(response.body.invitations[0].contactId).toBe(contact3Id);
    });

    it("should return 400 for missing contactIds", async () => {
      await request(app)
        .post(`/events/${eventId}/invitations`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({})
        .expect(400);
    });

    it("should return 400 for invalid event ID", async () => {
      await request(app)
        .post("/events/invalid/invitations")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ contactIds: [contact1Id] })
        .expect(400);
    });

    it("should return 404 for non-existent event", async () => {
      await request(app)
        .post("/events/99999/invitations")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ contactIds: [contact1Id] })
        .expect(404);
    });

    it("should return 401 without auth token", async () => {
      await request(app)
        .post(`/events/${eventId}/invitations`)
        .send({ contactIds: [contact1Id] })
        .expect(401);
    });
  });

  describe("POST /events/:eventId/rsvp - RSVP Response", () => {
    let eventId: number;

    beforeEach(async () => {
      // Create an event with invitations
      const eventData = {
        name: "RSVP Test Event",
        address: "123 Main St",
        time: new Date("2025-12-25T18:00:00Z").toISOString(),
        contactIds: [contact1Id, contact2Id],
      };

      const response = await request(app)
        .post("/events")
        .set("Authorization", `Bearer ${authToken}`)
        .send(eventData)
        .expect(201);

      eventId = response.body.event.id;
    });

    it("should update RSVP to attending", async () => {
      const response = await request(app)
        .post(`/events/${eventId}/rsvp`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          contactId: contact1Id,
          rsvpStatus: "attending",
          responseNote: "Looking forward to it!",
          isManualResponse: false,
        })
        .expect(200);

      expect(response.body).toHaveProperty("message");
      expect(response.body).toHaveProperty("invitation");
      expect(response.body.invitation.rsvpStatus).toBe("attending");
      expect(response.body.invitation.responseNote).toBe("Looking forward to it!");
      expect(response.body.invitation.respondedAt).toBeTruthy();
      expect(response.body.invitation.isManualResponse).toBe(false);
    });

    it("should update RSVP to maybe", async () => {
      const response = await request(app)
        .post(`/events/${eventId}/rsvp`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          contactId: contact1Id,
          rsvpStatus: "maybe",
          isManualResponse: true,
        })
        .expect(200);

      expect(response.body.invitation.rsvpStatus).toBe("maybe");
      expect(response.body.invitation.isManualResponse).toBe(true);
    });

    it("should update RSVP to declined", async () => {
      const response = await request(app)
        .post(`/events/${eventId}/rsvp`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          contactId: contact1Id,
          rsvpStatus: "declined",
          responseNote: "Can't make it, sorry!",
          isManualResponse: true,
        })
        .expect(200);

      expect(response.body.invitation.rsvpStatus).toBe("declined");
      expect(response.body.invitation.responseNote).toBe("Can't make it, sorry!");
    });

    it("should accept 'regretfully decline' as declined", async () => {
      const response = await request(app)
        .post(`/events/${eventId}/rsvp`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          contactId: contact1Id,
          rsvpStatus: "regretfully decline",
          isManualResponse: false,
        })
        .expect(200);

      expect(response.body.invitation.rsvpStatus).toBe("declined");
    });

    it("should create invitation if it doesn't exist", async () => {
      // RSVP for contact3 who wasn't initially invited
      const response = await request(app)
        .post(`/events/${eventId}/rsvp`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          contactId: contact3Id,
          rsvpStatus: "attending",
          isManualResponse: true,
        })
        .expect(200);

      expect(response.body.invitation.contactId).toBe(contact3Id);
      expect(response.body.invitation.rsvpStatus).toBe("attending");
    });

    it("should return 400 for invalid RSVP status", async () => {
      await request(app)
        .post(`/events/${eventId}/rsvp`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          contactId: contact1Id,
          rsvpStatus: "invalid_status",
        })
        .expect(400);
    });

    it("should return 400 for missing required fields", async () => {
      await request(app)
        .post(`/events/${eventId}/rsvp`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          contactId: contact1Id,
        })
        .expect(400);
    });

    it("should return 404 for non-existent event", async () => {
      await request(app)
        .post("/events/99999/rsvp")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          contactId: contact1Id,
          rsvpStatus: "attending",
        })
        .expect(404);
    });

    it("should return 401 without auth token", async () => {
      await request(app)
        .post(`/events/${eventId}/rsvp`)
        .send({
          contactId: contact1Id,
          rsvpStatus: "attending",
        })
        .expect(401);
    });
  });

  describe("GET /events/:eventId/rsvps - Get RSVP Status", () => {
    let eventId: number;

    beforeEach(async () => {
      // Create an event with invitations
      const eventData = {
        name: "RSVP Stats Event",
        address: "123 Main St",
        time: new Date("2025-12-25T18:00:00Z").toISOString(),
        contactIds: [contact1Id, contact2Id, contact3Id],
      };

      const response = await request(app)
        .post("/events")
        .set("Authorization", `Bearer ${authToken}`)
        .send(eventData)
        .expect(201);

      eventId = response.body.event.id;
    });

    it("should get all RSVPs for an event", async () => {
      // Add some RSVPs
      await request(app)
        .post(`/events/${eventId}/rsvp`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ contactId: contact1Id, rsvpStatus: "attending" })
        .expect(200);

      await request(app)
        .post(`/events/${eventId}/rsvp`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ contactId: contact2Id, rsvpStatus: "maybe" })
        .expect(200);

      const response = await request(app)
        .get(`/events/${eventId}/rsvps`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("event");
      expect(response.body).toHaveProperty("stats");
      expect(response.body).toHaveProperty("invitations");

      expect(response.body.event.id).toBe(eventId);
      expect(response.body.stats.total).toBe(3);
      expect(response.body.stats.attending).toBe(1);
      expect(response.body.stats.maybe).toBe(1);
      expect(response.body.stats.pending).toBe(1);
      expect(response.body.stats.declined).toBe(0);

      expect(response.body.invitations).toHaveLength(3);
    });

    it("should show all pending when no RSVPs received", async () => {
      const response = await request(app)
        .get(`/events/${eventId}/rsvps`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.stats.total).toBe(3);
      expect(response.body.stats.pending).toBe(3);
      expect(response.body.stats.attending).toBe(0);
      expect(response.body.stats.maybe).toBe(0);
      expect(response.body.stats.declined).toBe(0);
    });

    it("should return 404 for non-existent event", async () => {
      await request(app)
        .get("/events/99999/rsvps")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);
    });

    it("should return 401 without auth token", async () => {
      await request(app).get(`/events/${eventId}/rsvps`).expect(401);
    });

    it("should return 403 for event not owned by user", async () => {
      // Create another user
      const otherUserData = {
        firstName: "Other",
        lastName: "User",
        username: `otheruser${Date.now()}`,
        password: "password123",
      };

      await request(app).post("/users").send(otherUserData).expect(201);

      const otherLoginResponse = await request(app)
        .post("/login")
        .send({ username: otherUserData.username, password: "password123" })
        .expect(200);

      await request(app)
        .get(`/events/${eventId}/rsvps`)
        .set("Authorization", `Bearer ${otherLoginResponse.body.token}`)
        .expect(403);
    });
  });

  describe("GET /contacts/:contactId/invitations - Get Contact Invitations", () => {
    beforeEach(async () => {
      // Create multiple events and invite contact1
      const event1Data = {
        name: "Event 1",
        address: "123 Main St",
        time: new Date("2025-12-25T18:00:00Z").toISOString(),
        contactIds: [contact1Id, contact2Id],
      };

      const event2Data = {
        name: "Event 2",
        address: "456 Oak Ave",
        time: new Date("2025-12-31T20:00:00Z").toISOString(),
        contactIds: [contact1Id],
      };

      await request(app)
        .post("/events")
        .set("Authorization", `Bearer ${authToken}`)
        .send(event1Data)
        .expect(201);

      await request(app)
        .post("/events")
        .set("Authorization", `Bearer ${authToken}`)
        .send(event2Data)
        .expect(201);
    });

    it("should get all invitations for a contact", async () => {
      const response = await request(app)
        .get(`/contacts/${contact1Id}/invitations`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("contact");
      expect(response.body).toHaveProperty("invitations");
      expect(response.body.contact.id).toBe(contact1Id);
      expect(response.body.invitations).toHaveLength(2);
    });

    it("should return empty array for contact with no invitations", async () => {
      const response = await request(app)
        .get(`/contacts/${contact3Id}/invitations`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.invitations).toHaveLength(0);
    });

    it("should return 404 for non-existent contact", async () => {
      await request(app)
        .get("/contacts/99999/invitations")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);
    });

    it("should return 401 without auth token", async () => {
      await request(app)
        .get(`/contacts/${contact1Id}/invitations`)
        .expect(401);
    });
  });

  describe("RSVP Workflow Integration Tests", () => {
    it("should handle complete RSVP workflow", async () => {
      // 1. Create event with invitations
      const eventData = {
        name: "Complete Workflow Event",
        address: "123 Main St",
        time: new Date("2025-12-25T18:00:00Z").toISOString(),
        contactIds: [contact1Id, contact2Id, contact3Id],
      };

      const eventResponse = await request(app)
        .post("/events")
        .set("Authorization", `Bearer ${authToken}`)
        .send(eventData)
        .expect(201);

      const eventId = eventResponse.body.event.id;

      // 2. Check initial state - all pending
      let rsvpResponse = await request(app)
        .get(`/events/${eventId}/rsvps`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(rsvpResponse.body.stats.pending).toBe(3);

      // 3. Contact 1 responds: attending (automatic)
      await request(app)
        .post(`/events/${eventId}/rsvp`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          contactId: contact1Id,
          rsvpStatus: "attending",
          responseNote: "Excited!",
          isManualResponse: false,
        })
        .expect(200);

      // 4. Contact 2 responds: maybe (manual)
      await request(app)
        .post(`/events/${eventId}/rsvp`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          contactId: contact2Id,
          rsvpStatus: "maybe",
          isManualResponse: true,
        })
        .expect(200);

      // 5. Contact 3 declines (automatic)
      await request(app)
        .post(`/events/${eventId}/rsvp`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          contactId: contact3Id,
          rsvpStatus: "declined",
          responseNote: "Can't make it",
          isManualResponse: false,
        })
        .expect(200);

      // 6. Check final stats
      rsvpResponse = await request(app)
        .get(`/events/${eventId}/rsvps`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(rsvpResponse.body.stats.attending).toBe(1);
      expect(rsvpResponse.body.stats.maybe).toBe(1);
      expect(rsvpResponse.body.stats.declined).toBe(1);
      expect(rsvpResponse.body.stats.pending).toBe(0);

      // 7. Verify invitations in response
      const invitations = rsvpResponse.body.invitations;
      const attendingInvite = invitations.find(
        (i: any) => i.contactId === contact1Id
      );
      const maybeInvite = invitations.find((i: any) => i.contactId === contact2Id);
      const declinedInvite = invitations.find(
        (i: any) => i.contactId === contact3Id
      );

      expect(attendingInvite.isManualResponse).toBe(false);
      expect(maybeInvite.isManualResponse).toBe(true);
      expect(declinedInvite.responseNote).toBe("Can't make it");
    });

    it("should allow changing RSVP response", async () => {
      // Create event
      const eventData = {
        name: "Change RSVP Event",
        address: "123 Main St",
        time: new Date("2025-12-25T18:00:00Z").toISOString(),
        contactIds: [contact1Id],
      };

      const eventResponse = await request(app)
        .post("/events")
        .set("Authorization", `Bearer ${authToken}`)
        .send(eventData)
        .expect(201);

      const eventId = eventResponse.body.event.id;

      // First response: attending
      await request(app)
        .post(`/events/${eventId}/rsvp`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          contactId: contact1Id,
          rsvpStatus: "attending",
        })
        .expect(200);

      // Change to declined
      await request(app)
        .post(`/events/${eventId}/rsvp`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          contactId: contact1Id,
          rsvpStatus: "declined",
          responseNote: "Something came up",
        })
        .expect(200);

      // Verify final state
      const rsvpResponse = await request(app)
        .get(`/events/${eventId}/rsvps`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(rsvpResponse.body.stats.declined).toBe(1);
      expect(rsvpResponse.body.stats.attending).toBe(0);
      expect(rsvpResponse.body.invitations[0].responseNote).toBe(
        "Something came up"
      );
    });
  });
});

