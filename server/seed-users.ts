
import { storage } from "./storage";
import { hashPassword } from "./auth";

async function seedUsers() {
  try {
    console.log("Criando usuários de teste...");

    // Usuário Admin
    const adminExists = await storage.getUserByEmail("admin@cleanmyhouse.com");
    if (!adminExists) {
      const adminPassword = await hashPassword("admin123");
      await storage.createUser({
        email: "admin@cleanmyhouse.com",
        password: adminPassword,
        firstName: "Admin",
        lastName: "Sistema",
        role: "admin",
      });
      console.log("✓ Admin criado: admin@cleanmyhouse.com / admin123");
    } else {
      console.log("✓ Admin já existe");
    }

    // Funcionário 1
    const func1Exists = await storage.getUserByEmail("funcionario1@cleanmyhouse.com");
    if (!func1Exists) {
      const func1Password = await hashPassword("123456");
      await storage.createUser({
        email: "funcionario1@cleanmyhouse.com",
        password: func1Password,
        firstName: "João",
        lastName: "Silva",
        role: "employee",
      });
      console.log("✓ Funcionário 1 criado: funcionario1@cleanmyhouse.com / 123456");
    } else {
      console.log("✓ Funcionário 1 já existe");
    }

    // Funcionário 2
    const func2Exists = await storage.getUserByEmail("funcionario2@cleanmyhouse.com");
    if (!func2Exists) {
      const func2Password = await hashPassword("123456");
      await storage.createUser({
        email: "funcionario2@cleanmyhouse.com",
        password: func2Password,
        firstName: "Maria",
        lastName: "Santos",
        role: "employee",
      });
      console.log("✓ Funcionário 2 criado: funcionario2@cleanmyhouse.com / 123456");
    } else {
      console.log("✓ Funcionário 2 já existe");
    }

    console.log("✓ Usuários de teste criados com sucesso!");
  } catch (error) {
    console.error("Erro ao criar usuários de teste:", error);
  }
}

// Execute se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  seedUsers().then(() => {
    console.log("Seeding completed");
    process.exit(0);
  }).catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  });
}

export { seedUsers };
