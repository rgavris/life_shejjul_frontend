import { Repository, DataSource } from "typeorm";
import { Contact } from "../entities/Contact";

export class ContactService {
  private contactRepository: Repository<Contact>;

  constructor(dataSource: DataSource) {
    this.contactRepository = dataSource.getRepository(Contact);
  }

  async create(contactData: Partial<Contact>): Promise<Contact> {
    const contact = this.contactRepository.create(contactData);
    return await this.contactRepository.save(contact);
  }

  async findAll(): Promise<Contact[]> {
    return await this.contactRepository.find();
  }

  async findByUserId(userId: number): Promise<Contact[]> {
    return await this.contactRepository.find({
      where: { userId },
    });
  }

  async findById(id: number): Promise<Contact | null> {
    return await this.contactRepository.findOne({
      where: { id },
    });
  }

  async update(
    id: number,
    contactData: Partial<Contact>,
  ): Promise<Contact | null> {
    await this.contactRepository.update(id, contactData);
    return await this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.contactRepository.delete(id);
    return result.affected !== 0;
  }

  async findByEmail(email: string): Promise<Contact | null> {
    return await this.contactRepository.findOne({
      where: { email },
    });
  }

  async findByName(firstName: string, lastName?: string): Promise<Contact[]> {
    const whereCondition: { firstName: string; lastName?: string } = {
      firstName,
    };
    if (lastName) {
      whereCondition.lastName = lastName;
    }

    return await this.contactRepository.find({
      where: whereCondition,
    });
  }

  async findByPhoneNumber(phoneNumber: string): Promise<Contact | null> {
    return await this.contactRepository.findOne({
      where: { phoneNumber },
    });
  }
}
