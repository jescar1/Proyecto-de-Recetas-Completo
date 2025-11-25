import { Edit2, Trash2, Clock, Users } from 'lucide-react';

interface Recipe {
  title: string;
  description: string;
  category: string;
  difficulty: string;
  image: string;
  prepTime?: string;
  cookTime?: string;
  servings?: number;
}

interface AdminRecipeCardProps {
  recipe: Recipe;
  onEdit: () => void;
  onDelete: () => void;
}

const difficultyColors = {
  Fácil: 'bg-green-100 text-green-700',
  Media: 'bg-yellow-100 text-yellow-700',
  Difícil: 'bg-red-100 text-red-700',
};

export function AdminRecipeCard({ recipe, onEdit, onDelete }: AdminRecipeCardProps) {
  const difficultyColor =
    difficultyColors[recipe.difficulty as keyof typeof difficultyColors] ||
    'bg-gray-100 text-gray-700';

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* Image */}
      <div className="relative h-48 overflow-hidden bg-gray-200">
        <img
          src={recipe.image}
          alt={recipe.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-3 right-3">
          <span className={`px-3 py-1 rounded-full text-xs ${difficultyColor}`}>
            {recipe.difficulty}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-gray-900 mb-2">{recipe.title}</h3>
        <p className="text-gray-600 mb-4 line-clamp-2">{recipe.description}</p>

        {/* Meta Info */}
        <div className="flex items-center gap-4 text-gray-500 mb-4">
          {recipe.prepTime && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{recipe.prepTime}</span>
            </div>
          )}
          {recipe.servings && (
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{recipe.servings}</span>
            </div>
          )}
        </div>

        {/* Category Badge */}
        <div className="mb-4 pb-4 border-b border-gray-100">
          <span className="inline-block px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-xs">
            {recipe.category}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Editar
          </button>
          <button
            onClick={onDelete}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
