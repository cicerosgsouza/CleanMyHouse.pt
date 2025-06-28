
import { storage } from "./storage";
import { hashPassword } from "./auth";

async function seedUsers() {
  try {
    // Verificar se já existem usuários no sistema
    const allUsers = await storage.getAllUsers();
    if (allUsers.length > 0) {
      console.log("✓ Sistema já possui usuários cadastrados - skip seeding");
      return;
    }

    console.log("Sistema vazio - criando usuário admin inicial...");

    // Criar apenas um usuário admin inicial
    const adminPassword = await hashPassword("admin123");
    await storage.createUser({
      email: "admin@cleanmyhouse.com",
      password: adminPassword,
      firstName: "Admin",
      lastName: "Sistema",
      role: "admin",
    });
    console.log("✓ Usuário admin criado: admin@cleanmyhouse.com / admin123");
    console.log("✓ Seeding concluído - apenas admin inicial criado");
  } catch (error) {
    console.error("Erro durante seeding:", error);
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
