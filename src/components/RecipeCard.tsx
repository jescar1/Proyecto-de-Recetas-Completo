import { Clock, Users, Utensils, MessageCircle } from 'lucide-react';

interface Recipe {
  title: string;
  description: string;
  category: string;
  difficulty: string;
  image: string;
  prepTime?: string;
  cookTime?: string;
  servings?: number;
  chef?: string;
  averageRating?: number;
  totalRatings?: number;
  totalComments?: number;
}

interface RecipeCardProps {
  recipe: Recipe;
  onClick: () => void;
}

const difficultyColors = {
  Fácil: 'bg-green-100 text-green-700',
  Media: 'bg-yellow-100 text-yellow-700',
  Difícil: 'bg-red-100 text-red-700',
};

export function RecipeCard({ recipe, onClick }: RecipeCardProps) {
  const difficultyColor =
    difficultyColors[recipe.difficulty as keyof typeof difficultyColors] ||
    'bg-gray-100 text-gray-700';

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all cursor-pointer overflow-hidden group"
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden bg-gray-200">
        <img
          src={recipe.image}
          alt={recipe.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />
        <div className="absolute top-3 right-3">
          <span className={`px-3 py-1 rounded-full text-xs ${difficultyColor}`}>
            {recipe.difficulty}
          </span>
        </div>
        {recipe.chef && (
          <div className="absolute top-3 left-3">
            <span className="px-3 py-1 rounded-full text-xs bg-orange-500 text-white">
              Chef: {recipe.chef}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-gray-900 group-hover:text-orange-600 transition-colors">
            {recipe.title}
          </h3>
        </div>

        <p className="text-gray-600 mb-4 line-clamp-2">{recipe.description}</p>

        {/* Meta Info */}
        <div className="flex items-center gap-4 text-gray-500">
          {recipe.prepTime && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{recipe.prepTime}</span>
            </div>
          )}
          {recipe.servings && (
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{recipe.servings} porciones</span>
            </div>
          )}
          {recipe.averageRating && recipe.averageRating > 0 && (
            <div className="flex items-center gap-1">
              <Utensils className="w-4 h-4 text-orange-500" />
              <span>{recipe.averageRating.toFixed(1)}</span>
            </div>
          )}
          {recipe.totalComments && recipe.totalComments > 0 && (
            <div className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
              <span>{recipe.totalComments}</span>
            </div>
          )}
        </div>

        {/* Category Badge */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <span className="inline-block px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-xs">
            {recipe.category}
          </span>
        </div>
      </div>
    </div>
  );
}