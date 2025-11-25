import { useState, useEffect } from 'react';
import { RecipeForm } from './RecipeForm';
import { AdminRecipeCard } from './AdminRecipeCard';
import { ChefHat, LogOut, Plus, User } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface Recipe {
  key: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  image: string;
  ingredients: string[];
  instructions: string[];
  prepTime: string;
  cookTime: string;
  servings: number;
  chef?: string;
}

interface AdminPanelProps {
  onLogout: () => void;
  user: any;
}

export function AdminPanel({ onLogout, user }: AdminPanelProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [accessToken, setAccessToken] = useState('');

  useEffect(() => {
    getAccessToken();
    fetchRecipes();
  }, []);

  const getAccessToken = async () => {
    try {
      const { data: { session } } = await import('@supabase/supabase-js').then(
        async (mod) => {
          const { createClient } = mod;
          const supabase = createClient(
            `https://${projectId}.supabase.co`,
            publicAnonKey
          );
          return supabase.auth.getSession();
        }
      );
      if (session?.access_token) {
        setAccessToken(session.access_token);
      }
    } catch (error) {
      console.error('Error getting access token:', error);
    }
  };

  const fetchRecipes = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-dd414dcc/recipes`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Error al cargar recetas');
      }

      const data = await response.json();
      setRecipes(data);
    } catch (error) {
      console.error('Error fetching recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (key: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta receta?')) {
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-dd414dcc/recipes/${key}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Error al eliminar receta');
      }

      setRecipes(recipes.filter((r) => r.key !== key));
    } catch (error) {
      console.error('Error deleting recipe:', error);
      alert('Error al eliminar la receta');
    }
  };

  const handleEdit = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingRecipe(null);
  };

  const handleFormSuccess = () => {
    fetchRecipes();
    handleFormClose();
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full flex items-center justify-center">
                <ChefHat className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-gray-900">Panel de Administración</h1>
                <p className="text-gray-600">Gestiona las recetas</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-gray-700">
                <User className="w-5 h-5" />
                <span>{user.user_metadata?.name || user.email}</span>
                <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">
                  Admin
                </span>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Actions Bar */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-gray-900">Recetas</h2>
            <p className="text-gray-600">Total: {recipes.length} recetas</p>
          </div>
          <button
            onClick={() => {
              setEditingRecipe(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-lg hover:from-orange-600 hover:to-amber-700 transition-all shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            Nueva Receta
          </button>
        </div>

        {/* Recipes Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando recetas...</p>
          </div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <ChefHat className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No hay recetas aún</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Crear primera receta
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map((recipe) => (
              <AdminRecipeCard
                key={recipe.key}
                recipe={recipe}
                onEdit={() => handleEdit(recipe)}
                onDelete={() => handleDelete(recipe.key)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Recipe Form Modal */}
      {showForm && (
        <RecipeForm
          recipe={editingRecipe}
          accessToken={accessToken}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}
