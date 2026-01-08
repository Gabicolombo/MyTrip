import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class HashService {
  async encrypt(pwd: string): Promise<string> {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(pwd, saltRounds);
    return hashedPassword;
  }

  async decrypt(pwd: string, hashedPwd: string): Promise<boolean> {
    const isMatch = await bcrypt.compare(pwd, hashedPwd);
    return isMatch;
  }
}
