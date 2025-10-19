import { Repository } from "typeorm";
import { User } from "../entities/User";
import { AppDataSource } from "../index";

export class UserService {
  private userRepository: Repository<User>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.userRepository.create(userData);
    return await this.userRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return await this.userRepository.find({
      relations: ["event"],
    });
  }

  async findById(id: number): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { id },
      relations: ["event"],
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { username },
      relations: ["event"],
    });
  }

  async update(id: number, userData: Partial<User>): Promise<User | null> {
    await this.userRepository.update(id, userData);
    return await this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.userRepository.delete(id);
    return result.affected !== 0;
  }

  // TODO figure out what happens if age is null
  async findByAge(age: number): Promise<User[]> {
    return await this.userRepository.find({
      where: { age },
      relations: ["event"],
    });
  }

  async findByName(firstName: string, lastName?: string): Promise<User[]> {
    const whereCondition: any = { firstName };
    if (lastName) {
      whereCondition.lastName = lastName;
    }

    return await this.userRepository.find({
      where: whereCondition,
      relations: ["event"],
    });
  }
}
