
import { storage } from "./storage.js";
import { hashPassword } from "./auth.js";

async function resetPasswords() {
  try {
    console.log('Resetando senhas dos usuários...');
    
    // Reset Admin password
    const admin = await storage.getUserByEmail('admin@cleanmyhouse.com');
    if (admin) {
      const newHashedPassword = await hashPassword('admin123');
      await storage.updateUser(admin.id, { password: newHashedPassword });
      console.log('✓ Senha do admin resetada');
    }
    
    // Reset Employee 1 password
    const emp1 = await storage.getUserByEmail('funcionario1@cleanmyhouse.com');
    if (emp1) {
      const newHashedPassword = await hashPassword('123456');
      await storage.updateUser(emp1.id, { password: newHashedPassword });
      console.log('✓ Senha do funcionário 1 resetada');
    }
    
    // Reset Employee 2 password
    const emp2 = await storage.getUserByEmail('funcionario2@cleanmyhouse.com');
    if (emp2) {
      const newHashedPassword = await hashPassword('123456');
      await storage.updateUser(emp2.id, { password: newHashedPassword });
      console.log('✓ Senha do funcionário 2 resetada');
    }
    
    console.log('✓ Todas as senhas foram resetadas com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('Erro ao resetar senhas:', error);
    process.exit(1);
  }
}

resetPasswords();
