## ToDo

1. Got postgres running
2. Chose an ORM (typeORM)
3. Made our first table aka TypeOrm Entity
4. Made Claude refactor into a TypeScript project so that TypeORM would work
5. Make db CRUD functions:
 -- createUser, getUser, updateUser, deleteUser
 -- createEvent, getEvent, updateEvent, deleteEvent
 -- createContact, getContact, updateContact, deleteContact
 --- validation goes here
 
6. API:
-- getAllMyEvents()
-- Contact contacts: send event invitations
-- Reminders: email, text

6a: Convenience
- add package.json command to start postgres in background if not started

7. UI / UX
-- React
-- CSS

8. Transition to migrations
-- Add, e.g. yarn typeorm migration:generate -d src/data-source.ts -n CreateUserTable
-- yarn migrate CreateUserTable

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
