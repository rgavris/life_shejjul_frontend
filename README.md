## ToDo

- [x] Got postgres running
- [x] Chose an ORM (typeORM)
- [x] Made our first table aka TypeOrm Entity
- [x] Made Claude refactor into a TypeScript project so that TypeORM would work
- [x] Add integration testing suite

### CRUD Functions
- [x] ~~createUser, getUser, updateUser, deleteUser~~
- [x] ~~createEvent, getEvent, updateEvent, deleteEvent~~
- [x] ~~createContact, getContact, updateContact, deleteContact~~
- [ ] Validation
  - [x] Don't allow saving invalid contact info
  - [x] Notify user if invalid
  - [ ] Handle on backend (in CRUD or API)
  - [ ] Can also handle on frontend
 
### API Routes
- [x] GET /users
- [x] POST /users (create user)
- [x] GET /contacts
- [x] POST /login
- [ ] Auth
  - [ ] Keep user logged in, track
  - [ ] Make some API routes admin-only
- [x] getAllMyEvents()
- [ ] Add remaining API routes/endpoints for db CRUD
- [ ] getAllContactsWithUpcomingBirthdays()
- [ ] getAllContactsAttendingUpcomingEvents()
- [x] Audit services to see if by user 
- [x] Update Contact service so they accept user param
- [x] Only create contacts for logged-in users

### Contact Features
- [x] Send event invitations
- [ ] saveEventInvitationText()
- [x] sendEventInvitationsToContactList(Contact[])
- [ ] scheduleEventReminder: email, text

### User Profile
- [x] ~~DB entity: Update user to include username and password~~
- [x] ~~CRUD or API endpoint to login and store/retrieve password~~
- [x] ~~Crypto (bcrypt password hashing)~~
- [ ] Reset Password
- [ ] Frontend: User Profile

### UI / UX
- [ ] React
- [ ] CSS

### Migrations
- [ ] Transition to migrations
- [ ] Add migration generation command
- [ ] Add migration run command

### Convenience
- [ ] Add package.json command to start postgres in background if not started

### Tech Debt
- [x] Refactor test and prod DB creation

## Tables
Events
- Title
- Address
- Time
- Optional: contacts

Sql (also pretty fast and actually survives):
- Users
- Events
- Contacts

## Features
- reminder function: remind me
- list recurring events
- easy to edit (add/remove events)
- Optional contact feature: add email/number to email/text to event

## UI:
- Calendar
- Day, week, month views
- Contacts tab

## Architecture Ideation
Redis cache (quick access but short-lived):
{
me: {
00: {title: 'mytitle5', address: 'address', time: 1206H31Dec2013, contacts: {"joe shmuckatelly": joe@s.com, "whozitface": 122345534}},
01: {title: 'mytitle1', address: 'address', time: 1206H31Dec2013, contacts: {"joe shmuckatelly": joe@s.com, "whozitface": 122345534}},
02: {title: 'mytitle2', address: 'address', time: 1206H31Dec2013, contacts: {"joe shmuckatelly": joe@s.com, "whozitface": 122345534}},
03: {title: 'mytitle3', address: 'address', time: 1206H31Dec2013, contacts: {"joe shmuckatelly": joe@s.com, "whozitface": 122345534}},
04: {title: 'mytitle4', address: 'address', time: 1206H31Dec2013, contacts: {"joe shmuckatelly": joe@s.com, "whozitface": 122345534}},
05: {title: 'mytitle', address: 'address', time: 1206H31Dec2013, contacts: {"joe shmuckatelly": joe@s.com, "whozitface": 122345534}},
},
spouse: 
}

## Notes
"callback hell" -> .then/.catch -> async/await
RESTful API: endpoint, state/data, status codes (200, 404, 401, 500)

Steps: Make the DB, Define schema aka make entities, Write services to do CRUD operations
// Frontend (React/CSS)
// API: server to talk to outside world, logic to handle requests
// CRUD: mechanics of accessing the database
// DevOps: deploy the app, set up CI/CD pipelines, monitoring, etc.

