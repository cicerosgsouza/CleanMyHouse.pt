import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit, Plus, User as UserIcon } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";

interface UserFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: 'employee' | 'admin';
}

export function UserManagementTable() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'employee'
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: UserFormData) => {
      await apiRequest('POST', '/api/admin/users', userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Sucesso",
        description: "Usuário criado com sucesso",
      });
    },
    onError: async (error: any) => {
      let errorMessage = "Erro ao criar usuário";
      
      try {
        if (error?.message?.includes('400:')) {
          const responseText = error.message.split('400: ')[1];
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorMessage;
        }
      } catch {
        // Use default message if parsing fails
      }
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, userData }: { id: string; userData: Partial<UserFormData> }) => {
      await apiRequest('PUT', `/api/admin/users/${id}`, userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setIsDialogOpen(false);
      resetForm();
      setEditingUser(null);
      toast({
        title: "Sucesso",
        description: "Usuário atualizado com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar usuário",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/admin/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Sucesso",
        description: "Usuário excluído com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao desativar usuário",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: 'employee'
    });
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      password: '', // Don't prefill password for security
      role: user.role as 'employee' | 'admin' || 'employee'
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      // Para edição, só inclui a senha se foi fornecida
      const updateData = { ...formData };
      if (!updateData.password) {
        delete (updateData as any).password;
      }
      updateUserMutation.mutate({ id: editingUser.id.toString(), userData: updateData });
    } else {
      createUserMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir permanentemente este usuário? Esta ação não pode ser desfeita.')) {
      deleteUserMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Gerenciar Usuários</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="brand-gradient brand-gradient-hover text-white"
              onClick={() => {
                setEditingUser(null);
                resetForm();
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingUser ? 'Editar Usuário' : 'Adicionar Novo Usuário'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="firstName">Nome</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="Digite o nome"
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Sobrenome</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Digite o sobrenome"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Digite o e-mail"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">
                  {editingUser ? 'Nova Senha (deixe em branco para manter a atual)' : 'Senha'}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUser ? "Digite apenas se quiser alterar" : "Digite a senha"}
                  required={!editingUser}
                />
              </div>
              <div>
                <Label htmlFor="role">Nível de Acesso</Label>
                <Select value={formData.role} onValueChange={(value: 'employee' | 'admin') => setFormData({ ...formData, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Funcionário</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex space-x-3 pt-4">
                <Button 
                  type="submit" 
                  className="flex-1 brand-gradient brand-gradient-hover text-white"
                  disabled={createUserMutation.isPending || updateUserMutation.isPending}
                >
                  {(createUserMutation.isPending || updateUserMutation.isPending) && (
                    <LoadingSpinner size="sm" className="mr-2" />
                  )}
                  {editingUser ? 'Atualizar' : 'Salvar'}
                </Button>
                <Button 
                  type="button" 
                  variant="secondary" 
                  className="flex-1"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Nível</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-4">
                      <UserIcon className="h-5 w-5 text-gray-600" />
                    </div>
                    <div className="font-medium text-gray-900">
                      {`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Sem nome'}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-gray-600">{user.email}</TableCell>
                <TableCell>
                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                    {user.role === 'admin' ? 'Administrador' : 'Funcionário'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.isActive ? 'default' : 'destructive'}>
                    {user.isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(user)}
                      className="text-pink-600 hover:text-pink-800"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(user.id.toString())}
                      className="text-red-600 hover:text-red-800"
                      disabled={deleteUserMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
