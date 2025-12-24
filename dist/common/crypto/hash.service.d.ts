export declare class HashService {
    encrypt(pwd: string): Promise<string>;
    decrypt(pwd: string, hashedPwd: string): Promise<boolean>;
}
