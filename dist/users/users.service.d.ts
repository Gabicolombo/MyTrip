import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { HashService } from '../common/crypto/hash.service';
export declare class UsersService {
    private readonly usersRepository;
    private readonly hashService;
    constructor(usersRepository: Repository<User>, hashService: HashService);
    create(createUserDto: CreateUserDto): Promise<User>;
    login(loginUserDto: LoginUserDto): Promise<User>;
    findAll(): string;
    findOne(id: number): string;
    update(id: number, updateUserDto: UpdateUserDto): string;
    remove(id: number): string;
}
