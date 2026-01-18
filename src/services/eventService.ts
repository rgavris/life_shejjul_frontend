import { Repository, DataSource } from "typeorm";
import { Event } from "../entities/Event";

export class EventService {
  private eventRepository: Repository<Event>;

  constructor(dataSource: DataSource) {
    this.eventRepository = dataSource.getRepository(Event);
  }

  async create(eventData: Partial<Event>): Promise<Event> {
    const event = this.eventRepository.create(eventData);
    return await this.eventRepository.save(event);
  }

  async findAll(): Promise<Event[]> {
    return await this.eventRepository.find({
      relations: ["contacts"],
    });
  }

  async findByEventId(id: number): Promise<Event | null> {
    return await this.eventRepository.findOne({
      where: { id },
      relations: ["contacts"],
    });
  }

  async findByUserId(id: number): Promise<Event[] | null> {
    return await this.eventRepository.find({ where: { userId: id } });
  }

  async update(id: number, eventData: Partial<Event>): Promise<Event | null> {
    await this.eventRepository.update(id, eventData);
    return await this.findByEventId(id);
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.eventRepository.delete(id);
    return result.affected !== 0;
  }

  async findByName(name: string): Promise<Event[]> {
    return await this.eventRepository.find({
      where: { name },
      relations: ["contacts"],
    });
  }

  async findByAddress(address: string): Promise<Event[]> {
    return await this.eventRepository.find({
      where: { address },
      relations: ["contacts"],
    });
  }

  async findByTimeRange(startTime: Date, endTime: Date): Promise<Event[]> {
    return await this.eventRepository
      .createQueryBuilder("event")
      .leftJoinAndSelect("event.contacts", "contacts")
      .where("event.time >= :startTime AND event.time <= :endTime", {
        startTime,
        endTime,
      })
      .getMany();
  }

  async findByContact(contactId: number): Promise<Event[]> {
    return await this.eventRepository.find({
      where: { contacts: { id: contactId } },
      relations: ["contacts"],
    });
  }
  
  async findUpcoming(): Promise<Event[]> {
    const now = new Date();
    return await this.eventRepository
      .createQueryBuilder("event")
      .leftJoinAndSelect("event.contacts", "contacts")
      .where("event.time > :now", { now })
      .orderBy("event.time", "ASC")
      .getMany();
  }
}
