import { PrismaClient } from "@prisma/client";

class Prisma {
  private static instance: PrismaClient;

  private constructor() {}

  public static getClient() {
    if (!Prisma.instance) {
      Prisma.instance = new PrismaClient();
    }
    return Prisma.instance;
  }
}

export const prisma = Prisma.getClient();
