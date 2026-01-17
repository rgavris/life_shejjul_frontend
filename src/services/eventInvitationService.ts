import { Repository, DataSource } from "typeorm";
import { EventInvitation, RSVPStatus } from "../entities/EventInvitation";

export class EventInvitationService {
  private invitationRepository: Repository<EventInvitation>;

  constructor(dataSource: DataSource) {
    this.invitationRepository = dataSource.getRepository(EventInvitation);
  }

  async create(invitationData: Partial<EventInvitation>): Promise<EventInvitation> {
    const invitation = this.invitationRepository.create(invitationData);
    return await this.invitationRepository.save(invitation);
  }

  async findByEventId(eventId: number): Promise<EventInvitation[]> {
    return await this.invitationRepository.find({
      where: { eventId },
      relations: ["contact", "event"],
    });
  }

  async findByContactId(contactId: number): Promise<EventInvitation[]> {
    return await this.invitationRepository.find({
      where: { contactId },
      relations: ["event", "contact"],
    });
  }
  
  async findByEventAndContact(
    eventId: number,
    contactId: number
  ): Promise<EventInvitation | null> {
    return await this.invitationRepository.findOne({
      where: { eventId, contactId },
      relations: ["event", "contact"],
    });
  }

  async updateRSVP(
    eventId: number,
    contactId: number,
    rsvpStatus: RSVPStatus,
    responseNote?: string,
    isManualResponse: boolean = false
  ): Promise<EventInvitation | null> {
    let invitation = await this.findByEventAndContact(eventId, contactId);

    if (!invitation) {
      // Create invitation if it doesn't exist
      invitation = await this.create({
        eventId,
        contactId,
        rsvpStatus,
        respondedAt: new Date(),
        responseNote: responseNote || null,
        isManualResponse,
      });
    } else {
      // Update existing invitation
      invitation.rsvpStatus = rsvpStatus;
      invitation.respondedAt = new Date();
      invitation.responseNote = responseNote || null;
      invitation.isManualResponse = isManualResponse;
      invitation = await this.invitationRepository.save(invitation);
    }

    return invitation;
  }

  async bulkCreateInvitations(
    eventId: number,
    contactIds: number[]
  ): Promise<EventInvitation[]> {
    const invitations: EventInvitation[] = [];

    for (const contactId of contactIds) {
      // Check if invitation already exists
      const existing = await this.findByEventAndContact(eventId, contactId);
      if (!existing) {
        const invitation = await this.create({
          eventId,
          contactId,
          rsvpStatus: RSVPStatus.PENDING,
          respondedAt: null,
          responseNote: null,
          isManualResponse: false,
        });
        invitations.push(invitation);
      }
    }

    return invitations;
  }

  async getRSVPStats(eventId: number): Promise<{
    total: number;
    attending: number;
    maybe: number;
    declined: number;
    pending: number;
  }> {
    const invitations = await this.findByEventId(eventId);

    return {
      total: invitations.length,
      attending: invitations.filter((i) => i.rsvpStatus === RSVPStatus.ATTENDING).length,
      maybe: invitations.filter((i) => i.rsvpStatus === RSVPStatus.MAYBE).length,
      declined: invitations.filter((i) => i.rsvpStatus === RSVPStatus.DECLINED).length,
      pending: invitations.filter((i) => i.rsvpStatus === RSVPStatus.PENDING).length,
    };
  }

  async delete(invitationId: number): Promise<boolean> {
    const result = await this.invitationRepository.delete(invitationId);
    return result.affected !== 0;
  }
}

