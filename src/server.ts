import "reflect-metadata";
import { DataSource } from "typeorm";
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "./entities/User";
import { Event } from "./entities/Event";
import { Contact } from "./entities/Contact";
import { EventInvitation, RSVPStatus } from "./entities/EventInvitation";
import { EventReminder, ReminderType, ReminderRecipient } from "./entities/EventReminder";
import { UserService } from "./services/userService";
import { ContactService } from "./services/contactService";
import { EventService } from "./services/eventService";
import { EventInvitationService } from "./services/eventInvitationService";
import { EventReminderService } from "./services/eventReminderService";

type AuthenticatedUser = {
  userId: number;
  username: string;
  iat: number;
  exp: number;
};

type AuthResult = {
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
};

export function createApp(dataSource: DataSource) {
  const app = express();
  app.use(express.json());

  const userService = new UserService(dataSource);
  const contactService = new ContactService(dataSource);
  const eventService = new EventService(dataSource);
  const invitationService = new EventInvitationService(dataSource);
  const reminderService = new EventReminderService(dataSource);

  const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

  // Health check endpoint
  app.get("/health", async (req, res) => {
    try {
      // Check database connection
      const isConnected = dataSource.isInitialized;
      let dbStatus = "disconnected";
      
      if (isConnected) {
        // Try a simple query to verify database is responsive
        await dataSource.query("SELECT 1");
        dbStatus = "connected";
      }

      const healthStatus = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        database: {
          status: dbStatus,
          type: "postgres",
        },
        server: {
          uptime: process.uptime(),
        },
      };

      if (dbStatus === "connected") {
        res.status(200).json(healthStatus);
      } else {
        res.status(503).json({
          ...healthStatus,
          status: "unhealthy",
        });
      }
    } catch (error: any) {
      res.status(503).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        database: {
          status: "error",
          error: error.message,
        },
        server: {
          uptime: process.uptime(),
        },
      });
    }
  });

  const verifyAuth = (req: any): AuthResult => {
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

  const validateBirthday = (birthMonth: any, birthDay: any, birthYear?: any): { valid: boolean; month?: number; day?: number; year?: number; error?: string } => {
    // If both month and day are not provided, that's valid (all optional)
    if ((birthMonth === undefined || birthMonth === null) && (birthDay === undefined || birthDay === null)) {
      return { valid: true };
    }

    // If only one is provided, that's invalid - need both or neither
    if ((birthMonth === undefined || birthMonth === null) !== (birthDay === undefined || birthDay === null)) {
      return { valid: false, error: "birthMonth and birthDay must both be provided together, or both omitted" };
    }

    // Validate month
    const month = parseInt(birthMonth);
    if (isNaN(month) || month < 1 || month > 12) {
      return { valid: false, error: "birthMonth must be between 1 and 12" };
    }

    // Validate day
    const day = parseInt(birthDay);
    if (isNaN(day) || day < 1 || day > 31) {
      return { valid: false, error: "birthDay must be between 1 and 31" };
    }

    // Validate day is valid for the month
    const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (day > daysInMonth[month - 1]) {
      return { valid: false, error: `Invalid day for month ${month}. Maximum days: ${daysInMonth[month - 1]}` };
    }

    // Validate year if provided
    let year: number | undefined;
    if (birthYear !== undefined && birthYear !== null) {
      year = parseInt(birthYear);
      if (isNaN(year) || year < 1900 || year > new Date().getFullYear()) {
        return { valid: false, error: `birthYear must be between 1900 and ${new Date().getFullYear()}` };
      }
    }

    return { valid: true, month, day, year };
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
    if (!auth.success || !auth.user) {
      return res.status(401).json({ error: auth.error });
    }

    try {
      const contacts = await contactService.findByUserId(auth.user.userId);
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contacts" });
    }
  });

  app.post("/contacts", async (req, res) => {
    const auth = verifyAuth(req);
    if (!auth.success) {
      return res.status(401).json({ error: auth.error });
    }

    try {
      const { firstName, lastName, email, phoneNumber, userId, birthMonth, birthDay, birthYear } = req.body;

      // Validate required fields
      if (!firstName || !lastName || !email || !phoneNumber || !userId) {
        return res.status(400).json({ error: "Missing required fields: firstName, lastName, email, phoneNumber, userId" });
      }

      // Validate birthday fields (all optional, but if provided must be valid)
      const birthdayValidation = validateBirthday(birthMonth, birthDay, birthYear);
      if (!birthdayValidation.valid) {
        return res.status(400).json({ error: birthdayValidation.error });
      }

      const contactData: any = {
        firstName,
        lastName,
        email,
        phoneNumber,
        userId,
      };

      // Only add birthday fields if they were provided
      if (birthdayValidation.month !== undefined) {
        contactData.birthMonth = birthdayValidation.month;
        contactData.birthDay = birthdayValidation.day;
        if (birthdayValidation.year !== undefined) {
          contactData.birthYear = birthdayValidation.year;
        }
      }

      const contact = await contactService.create(contactData);

      res.status(201).json(contact);
    } catch (error) {
      res.status(500).json({ error: "Failed to create contact" });
    }
  });

  app.get("/getAllMyEvents", async (req, res) => {
    const { success, user, error } = verifyAuth(req);

    if (!success || !user) {
      return res.status(401).json({ error: error });
    }

    try {
      const events = await eventService.findByUserId(user.userId);

      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  // Create event with invitations
  app.post("/events", async (req, res) => {
    const auth = verifyAuth(req);
    if (!auth.success || !auth.user) {
      return res.status(401).json({ error: auth.error });
    }

    try {
      const { name, address, time, contactIds } = req.body;

      if (!name || !address || !time) {
        return res.status(400).json({
          error: "Missing required fields: name, address, time",
        });
      }

      // Create the event
      const event = await eventService.create({
        name,
        address,
        time: new Date(time),
        userId: auth.user.userId,
        // Don't set contactId - we'll use invitations instead
      });

      // Create invitations if contactIds provided
      let invitations: EventInvitation[] = [];
      if (contactIds && Array.isArray(contactIds) && contactIds.length > 0) {
        // Verify all contacts belong to the user
        for (const contactId of contactIds) {
          const contact = await contactService.findById(contactId);
          if (!contact || contact.userId !== auth.user.userId) {
            return res.status(400).json({
              error: `Contact ${contactId} not found or doesn't belong to you`,
            });
          }
        }

        invitations = await invitationService.bulkCreateInvitations(
          event.id,
          contactIds
        );
      }

      res.status(201).json({
        event,
        invitations: invitations,
        invitationCount: invitations.length,
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to create event", details: error.message });
    }
  });

  // Send invitations to contacts for an existing event
  app.post("/events/:eventId/invitations", async (req, res) => {
    const auth = verifyAuth(req);
    if (!auth.success || !auth.user) {
      return res.status(401).json({ error: auth.error });
    }

    try {
      const eventId = parseInt(req.params.eventId);
      if (isNaN(eventId)) {
        return res.status(400).json({ error: "Invalid event ID" });
      }

      // Verify event belongs to user
      const event = await eventService.findByEventId(eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      if (event.userId !== auth.user.userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const { contactIds } = req.body;
      if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
        return res.status(400).json({
          error: "contactIds array is required",
        });
      }

      // Verify all contacts belong to the user
      for (const contactId of contactIds) {
        const contact = await contactService.findById(contactId);
        if (!contact || contact.userId !== auth.user.userId) {
          return res.status(400).json({
            error: `Contact ${contactId} not found or doesn't belong to you`,
          });
        }
      }

      const invitations = await invitationService.bulkCreateInvitations(
        eventId,
        contactIds
      );

      res.status(201).json({
        message: "Invitations sent",
        invitations,
        count: invitations.length,
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to send invitations", details: error.message });
    }
  });

  // RSVP response (automatic or manual)
  app.post("/events/:eventId/rsvp", async (req, res) => {
    const auth = verifyAuth(req);
    if (!auth.success || !auth.user) {
      return res.status(401).json({ error: auth.error });
    }

    try {
      const eventId = parseInt(req.params.eventId);
      if (isNaN(eventId)) {
        return res.status(400).json({ error: "Invalid event ID" });
      }

      const { contactId, rsvpStatus, responseNote, isManualResponse } = req.body;

      if (!contactId || !rsvpStatus) {
        return res.status(400).json({
          error: "Missing required fields: contactId, rsvpStatus",
        });
      }

      // Map user-friendly status names to enum values
      const statusMap: { [key: string]: RSVPStatus } = {
        attending: RSVPStatus.ATTENDING,
        maybe: RSVPStatus.MAYBE,
        declined: RSVPStatus.DECLINED,
        "regretfully decline": RSVPStatus.DECLINED,
        "regretfully_decline": RSVPStatus.DECLINED,
      };

      // Normalize status (case-insensitive)
      const normalizedStatus = (rsvpStatus as string).toLowerCase().trim();
      const mappedStatus = statusMap[normalizedStatus];

      if (!mappedStatus) {
        return res.status(400).json({
          error: `Invalid rsvpStatus. Must be one of: "attending", "maybe", "declined" (or "regretfully decline")`,
        });
      }

      // Verify event exists
      const event = await eventService.findByEventId(eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      // Verify contact belongs to user
      const contact = await contactService.findById(contactId);
      if (!contact || contact.userId !== auth.user.userId) {
        return res.status(400).json({
          error: "Contact not found or doesn't belong to you",
        });
      }

      const invitation = await invitationService.updateRSVP(
        eventId,
        contactId,
        mappedStatus,
        responseNote,
        isManualResponse === true
      );

      res.json({
        message: "RSVP updated successfully",
        invitation,
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update RSVP", details: error.message });
    }
  });

  // Get RSVP status for an event
  app.get("/events/:eventId/rsvps", async (req, res) => {
    const auth = verifyAuth(req);
    if (!auth.success || !auth.user) {
      return res.status(401).json({ error: auth.error });
    }

    try {
      const eventId = parseInt(req.params.eventId);
      if (isNaN(eventId)) {
        return res.status(400).json({ error: "Invalid event ID" });
      }

      // Verify event belongs to user
      const event = await eventService.findByEventId(eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      if (event.userId !== auth.user.userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const invitations = await invitationService.findByEventId(eventId);
      const stats = await invitationService.getRSVPStats(eventId);

      res.json({
        event: {
          id: event.id,
          name: event.name,
          address: event.address,
          time: event.time,
        },
        stats,
        invitations,
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch RSVPs", details: error.message });
    }
  });

  // Get invitations for a specific contact
  app.get("/contacts/:contactId/invitations", async (req, res) => {
    const auth = verifyAuth(req);
    if (!auth.success || !auth.user) {
      return res.status(401).json({ error: auth.error });
    }

    try {
      const contactId = parseInt(req.params.contactId);
      if (isNaN(contactId)) {
        return res.status(400).json({ error: "Invalid contact ID" });
      }

      // Verify contact belongs to user
      const contact = await contactService.findById(contactId);
      if (!contact || contact.userId !== auth.user.userId) {
        return res.status(404).json({ error: "Contact not found" });
      }

      const invitations = await invitationService.findByContactId(contactId);

      res.json({
        contact: {
          id: contact.id,
          firstName: contact.firstName,
          lastName: contact.lastName,
        },
        invitations,
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch invitations", details: error.message });
    }
  });

  app.get("/contacts/upcoming-birthdays", async (req, res) => {
    const auth = verifyAuth(req);
    if (!auth.success || !auth.user) {
      return res.status(401).json({ error: auth.error });
    }

    try {
      // Support multiple input formats: days, weeks, months, years
      let daysAhead: number;
      const daysParam = req.query.days as string;
      const weeksParam = req.query.weeks as string;
      const monthsParam = req.query.months as string;
      const yearsParam = req.query.years as string;

      if (daysParam) {
        daysAhead = parseInt(daysParam);
        if (isNaN(daysAhead)) {
          return res.status(400).json({ error: "days parameter must be a valid number" });
        }
      } else if (weeksParam) {
        const weeks = parseInt(weeksParam);
        if (isNaN(weeks)) {
          return res.status(400).json({ error: "weeks parameter must be a valid number" });
        }
        daysAhead = weeks * 7;
      } else if (monthsParam) {
        const months = parseInt(monthsParam);
        if (isNaN(months)) {
          return res.status(400).json({ error: "months parameter must be a valid number" });
        }
        daysAhead = months * 30; // Approximate month as 30 days
      } else if (yearsParam) {
        const years = parseInt(yearsParam);
        if (isNaN(years)) {
          return res.status(400).json({ error: "years parameter must be a valid number" });
        }
        daysAhead = years * 365; // Approximate year as 365 days
      } else {
        // Default to 30 days if no parameter provided
        daysAhead = 30;
      }

      // Validate range: 1 week (7 days) to 1 year (365 days)
      const MIN_DAYS = 7;   // 1 week
      const MAX_DAYS = 365; // 1 year

      if (daysAhead < MIN_DAYS) {
        return res.status(400).json({ 
          error: `Range must be at least ${MIN_DAYS} days (1 week). Provided: ${daysAhead} days` 
        });
      }

      if (daysAhead > MAX_DAYS) {
        return res.status(400).json({ 
          error: `Range must be at most ${MAX_DAYS} days (1 year). Provided: ${daysAhead} days` 
        });
      }

      const contacts = await contactService.findContactsWithUpcomingBirthdays(
        auth.user.userId,
        daysAhead
      );

      res.json({
        daysAhead,
        range: {
          from: new Date().toISOString(),
          to: new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString(),
        },
        count: contacts.length,
        contacts,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch upcoming birthdays" });
    }
  });

  app.put("/contacts/:id", async (req, res) => {
    const auth = verifyAuth(req);
    if (!auth.success || !auth.user) {
      return res.status(401).json({ error: auth.error });
    }

    try {
      const contactId = parseInt(req.params.id);
      if (isNaN(contactId)) {
        return res.status(400).json({ error: "Invalid contact ID" });
      }

      // Check if contact exists and belongs to user
      const existingContact = await contactService.findById(contactId);
      if (!existingContact) {
        return res.status(404).json({ error: "Contact not found" });
      }
      if (existingContact.userId !== auth.user.userId) {
        return res.status(403).json({ error: "Not authorized to update this contact" });
      }

      const { firstName, lastName, email, phoneNumber, birthMonth, birthDay, birthYear } = req.body;

      // Build update data
      const updateData: any = {};
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (email !== undefined) updateData.email = email;
      if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;

      // Handle birthday updates
      // If both month and day are explicitly null, clear the birthday
      if (!birthMonth && !birthDay) {
        updateData.birthMonth = null;
        updateData.birthDay = null;
        updateData.birthYear = birthYear === null ? null : birthYear;
      } else if (birthMonth !== undefined || birthDay !== undefined || birthYear !== undefined) {
        // Validate birthday if any part is provided
        const birthdayValidation = validateBirthday(
          birthMonth !== undefined ? birthMonth : existingContact.birthMonth,
          birthDay !== undefined ? birthDay : existingContact.birthDay,
          birthYear !== undefined ? birthYear : existingContact.birthYear
        );
        if (!birthdayValidation.valid) {
          return res.status(400).json({ error: birthdayValidation.error });
        }
        // Only update if both month and day are provided, or if we're keeping existing values
        if (birthdayValidation.month !== undefined) {
          updateData.birthMonth = birthdayValidation.month;
          updateData.birthDay = birthdayValidation.day;
          if (birthYear !== undefined) {
            updateData.birthYear = birthdayValidation.year;
          } else if (birthdayValidation.year !== undefined) {
            updateData.birthYear = birthdayValidation.year;
          }
        }
      }

      const updatedContact = await contactService.update(contactId, updateData);
      if (!updatedContact) {
        return res.status(500).json({ error: "Failed to update contact" });
      }

      res.json(updatedContact);
    } catch (error) {
      res.status(500).json({ error: "Failed to update contact" });
    }
  });

  // Create reminder for an event
  app.post("/events/:eventId/reminders", async (req, res) => {
    const auth = verifyAuth(req);
    if (!auth.success || !auth.user) {
      return res.status(401).json({ error: auth.error });
    }

    try {
      const eventId = parseInt(req.params.eventId);
      if (isNaN(eventId)) {
        return res.status(400).json({ error: "Invalid event ID" });
      }

      // Verify event belongs to user
      const event = await eventService.findByEventId(eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      if (event.userId !== auth.user.userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const {
        reminderTime,
        reminderType,
        recipientType,
        customMessage,
        autoCreate,
      } = req.body;

      // Auto-create standard reminders (7 days, 1 day, 2 hours before)
      if (autoCreate === true) {
        const reminderTypes = reminderType
          ? [reminderType]
          : [ReminderType.EMAIL];
        const recipient = recipientType || ReminderRecipient.ALL_INVITEES;

        const reminders = await reminderService.createMultipleReminders(
          eventId,
          auth.user.userId,
          event.time,
          reminderTypes,
          recipient
        );

        return res.status(201).json({
          message: "Reminders created",
          reminders,
          count: reminders.length,
        });
      }

      // Create single custom reminder
      if (!reminderTime) {
        return res.status(400).json({
          error: "reminderTime is required (unless autoCreate is true)",
        });
      }

      const reminder = await reminderService.create({
        eventId,
        userId: auth.user.userId,
        reminderTime: new Date(reminderTime),
        reminderType: reminderType || ReminderType.EMAIL,
        recipientType: recipientType || ReminderRecipient.ALL_INVITEES,
        customMessage: customMessage || null,
      });

      res.status(201).json({
        message: "Reminder created",
        reminder,
      });
    } catch (error: any) {
      res.status(500).json({
        error: "Failed to create reminder",
        details: error.message,
      });
    }
  });

  // Get reminders for an event
  app.get("/events/:eventId/reminders", async (req, res) => {
    const auth = verifyAuth(req);
    if (!auth.success || !auth.user) {
      return res.status(401).json({ error: auth.error });
    }

    try {
      const eventId = parseInt(req.params.eventId);
      if (isNaN(eventId)) {
        return res.status(400).json({ error: "Invalid event ID" });
      }

      // Verify event belongs to user
      const event = await eventService.findByEventId(eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      if (event.userId !== auth.user.userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const reminders = await reminderService.findByEventId(eventId);

      res.json({
        event: {
          id: event.id,
          name: event.name,
          time: event.time,
        },
        reminders,
      });
    } catch (error: any) {
      res.status(500).json({
        error: "Failed to fetch reminders",
        details: error.message,
      });
    }
  });

  // Get all reminders for user
  app.get("/reminders", async (req, res) => {
    const auth = verifyAuth(req);
    if (!auth.success || !auth.user) {
      return res.status(401).json({ error: auth.error });
    }

    try {
      const { upcoming } = req.query;

      let reminders;
      if (upcoming === "true") {
        const days = parseInt(req.query.days as string) || 30;
        reminders = await reminderService.findUpcomingReminders(
          auth.user.userId,
          days
        );
      } else {
        reminders = await reminderService.findByUserId(auth.user.userId);
      }

      const stats = await reminderService.getReminderStats(auth.user.userId);

      res.json({
        reminders,
        stats,
      });
    } catch (error: any) {
      res.status(500).json({
        error: "Failed to fetch reminders",
        details: error.message,
      });
    }
  });

  // Update reminder
  app.put("/reminders/:id", async (req, res) => {
    const auth = verifyAuth(req);
    if (!auth.success || !auth.user) {
      return res.status(401).json({ error: auth.error });
    }

    try {
      const reminderId = parseInt(req.params.id);
      if (isNaN(reminderId)) {
        return res.status(400).json({ error: "Invalid reminder ID" });
      }

      const reminder = await reminderService.findById(reminderId);
      if (!reminder) {
        return res.status(404).json({ error: "Reminder not found" });
      }
      if (reminder.userId !== auth.user.userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const { reminderTime, customMessage, status } = req.body;

      const updateData: any = {};
      if (reminderTime) updateData.reminderTime = new Date(reminderTime);
      if (customMessage !== undefined) updateData.customMessage = customMessage;
      if (status) updateData.status = status;

      const updatedReminder = await reminderService.update(
        reminderId,
        updateData
      );

      res.json({
        message: "Reminder updated",
        reminder: updatedReminder,
      });
    } catch (error: any) {
      res.status(500).json({
        error: "Failed to update reminder",
        details: error.message,
      });
    }
  });

  // Cancel/delete reminder
  app.delete("/reminders/:id", async (req, res) => {
    const auth = verifyAuth(req);
    if (!auth.success || !auth.user) {
      return res.status(401).json({ error: auth.error });
    }

    try {
      const reminderId = parseInt(req.params.id);
      if (isNaN(reminderId)) {
        return res.status(400).json({ error: "Invalid reminder ID" });
      }

      const reminder = await reminderService.findById(reminderId);
      if (!reminder) {
        return res.status(404).json({ error: "Reminder not found" });
      }
      if (reminder.userId !== auth.user.userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      await reminderService.cancel(reminderId);

      res.json({
        message: "Reminder cancelled",
      });
    } catch (error: any) {
      res.status(500).json({
        error: "Failed to cancel reminder",
        details: error.message,
      });
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
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USER || "rachel",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "life_schedule",
  entities: [User, Event, Contact, EventInvitation, EventReminder],
  synchronize: true, // for development: auto create database schema, no migrations
  logging: false,
});

export async function createAppDatabase() {
  const adminDataSource = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    database: "postgres",
    username: process.env.DB_USER || "rachel",
    password: process.env.DB_PASSWORD,
  });

  try {
    await adminDataSource.initialize();
    await adminDataSource.query(`CREATE DATABASE "life_schedule"`);
    console.log("App database created");
  } catch (error: any) {
    if (error.code !== "42P04") {
      console.error("Error creating app database:", error);
    }
  } finally {
    await adminDataSource.destroy();
  }
}

// My complaint:
// we had to figure out server.e2e.test.ts
// then setup.ts
// and then see: where do we make the db?
// it would be better to have the test db made in the test file
// one solution: remove redunant code
