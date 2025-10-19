import { Repository } from "typeorm";
import { Event } from "../entities/Event";
import { AppDataSource } from "../index";

export class EventService {
  private eventRepository: Repository<Event>;

  constructor() {
    this.eventRepository = AppDataSource.getRepository(Event);
  }

  async create(eventData: Partial<Event>): Promise<Event> {
    const event = this.eventRepository.create(eventData);
    return await this.eventRepository.save(event);
  }

  async findAll(): Promise<Event[]> {
    return await this.eventRepository.find({
      relations: ["contact"]
    });
  }

  async findById(id: number): Promise<Event | null> {
    return await this.eventRepository.findOne({
      where: { id },
      relations: ["contact"]
    });
  }

  async update(id: number, eventData: Partial<Event>): Promise<Event | null> {
    await this.eventRepository.update(id, eventData);
    return await this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.eventRepository.delete(id);
    return result.affected !== 0;
  }

  async findByName(name: string): Promise<Event[]> {
    return await this.eventRepository.find({
      where: { name },
      relations: ["contact"]
    });
  }

  async findByAddress(address: string): Promise<Event[]> {
    return await this.eventRepository.find({
      where: { address },
      relations: ["contact"]
    });
  }

  async findByTimeRange(startTime: Date, endTime: Date): Promise<Event[]> {
    return await this.eventRepository
      .createQueryBuilder("event")
      .leftJoinAndSelect("event.contact", "contact")
      .where("event.time >= :startTime AND event.time <= :endTime", {
        startTime,
        endTime
      })
      .getMany();
  }

  async findByContact(contactId: number): Promise<Event[]> {
    return await this.eventRepository.find({
      where: { contactId },
      relations: ["contact"]
    });
  }

  async findUpcoming(): Promise<Event[]> {
    const now = new Date();
    return await this.eventRepository
      .createQueryBuilder("event")
      .leftJoinAndSelect("event.contact", "contact")
      .where("event.time > :now", { now })
      .orderBy("event.time", "ASC")
      .getMany();
  }
}