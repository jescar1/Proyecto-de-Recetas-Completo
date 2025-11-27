import { useState, useEffect } from 'react';
import { X, Clock, Users, ChefHat, Plus, Minus, Utensils, MessageCircle, Send, Trash2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
}

interface Recipe {
  key: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  image: string;
  ingredients: Ingredient[];
  instructions: string[];
  prepTime: string;
  cookTime: string;
  servings: number;
  chef?: string;
  averageRating?: number;
  totalRatings?: number;
  totalComments?: number;
}

interface Comment {
  key: string;
  userName: string;
  comment: string;
  createdAt: string;
  userId?: string;
}

interface RecipeModalProps {
  recipe: Recipe;
  onClose: () => void;
}

const difficultyColors = {
  Fácil: 'bg-green-100 text-green-700',
  Media: 'bg-yellow-100 text-yellow-700',
  Difícil: 'bg-red-100 text-red-700',
};

export function RecipeModal({ recipe, onClose }: RecipeModalProps) {
  const [servings, setServings] = useState(recipe.servings);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [averageRating, setAverageRating] = useState(recipe.averageRating || 0);
  const [totalRatings, setTotalRatings] = useState(recipe.totalRatings || 0);

  const difficultyColor =
    difficultyColors[recipe.difficulty as keyof typeof difficultyColors] ||
    'bg-gray-100 text-gray-700';

  const servingsMultiplier = servings / recipe.servings;

  useEffect(() => {
    getAccessToken();
    fetchUserRating();
    fetchComments();
  }, []);

  const getAccessToken = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        setAccessToken(session.access_token);
        
        // Obtener información del usuario
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
          
          // Verificar si es admin
          const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();
          
          if (userData?.role === 'admin') {
            setIsAdmin(true);
          }
        }
      }
    } catch (error) {
      console.error('Error getting access token:', error);
    }
  };

  const fetchUserRating = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-dd414dcc/recipes/${recipe.key}/my-rating`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.rating) {
          setUserRating(data.rating);
        }
      }
    } catch (error) {
      console.error('Error fetching user rating:', error);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-dd414dcc/recipes/${recipe.key}/comments`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleRating = async (rating: number) => {
    if (!accessToken) {
      alert('Debes iniciar sesión para calificar');
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-dd414dcc/recipes/${recipe.key}/rating`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ rating }),
        }
      );

      if (response.ok) {
        setUserRating(rating);
        
        // Recalculate average
        const newTotal = totalRatings === 0 ? 1 : totalRatings;
        const newAverage = ((averageRating * totalRatings) + rating - userRating) / newTotal;
        setAverageRating(newAverage);
        if (totalRatings === 0) {
          setTotalRatings(1);
        }
      } else {
        const error = await response.json();
        alert(error.error || 'Error al calificar');
      }
    } catch (error) {
      console.error('Error rating recipe:', error);
      alert('Error al calificar la receta');
    }
  };

  const handleAddComment = async () => {
    if (!accessToken) {
      alert('Debes iniciar sesión para comentar');
      return;
    }

    if (!newComment.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-dd414dcc/recipes/${recipe.key}/comments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ comment: newComment }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setComments([data.comment, ...comments]);
        setNewComment('');
      } else {
        const error = await response.json();
        alert(error.error || 'Error al agregar comentario');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Error al agregar comentario');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentKey: string) => {
    if (!confirm('¿Estás seguro de eliminar este comentario?')) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-dd414dcc/admin/comments/${commentKey}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        setComments(comments.filter(c => c.key !== commentKey));
        alert('Comentario eliminado exitosamente');
      } else {
        const error = await response.json();
        alert(error.error || 'Error al eliminar el comentario');
      }
    } catch (error) {
      console.error('Error al eliminar comentario:', error);
      alert('Error al eliminar el comentario');
    }
  };

  const handleIncreaseServings = () => {
    setServings((prev) => prev + 1);
  };

  const handleDecreaseServings = () => {
    if (servings > 1) {
      setServings((prev) => prev - 1);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Hoy';
    if (days === 1) return 'Ayer';
    if (days < 7) return `Hace ${days} días`;
    return date.toLocaleDateString('es-ES');
  };

  const formatIngredient = (ingredient: Ingredient) => {
    const adjustedQuantity = ingredient.quantity * servingsMultiplier;
    const formattedQuantity = adjustedQuantity % 1 === 0 
      ? adjustedQuantity.toFixed(0) 
      : adjustedQuantity.toFixed(2);
    
    return `${formattedQuantity} ${ingredient.unit} de ${ingredient.name}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header Image */}
        <div className="relative h-64 bg-gray-200">
          <img
            src={recipe.image}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors shadow-lg"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
            <span className={`px-4 py-2 rounded-full ${difficultyColor} shadow-lg`}>
              {recipe.difficulty}
            </span>
            {recipe.chef && (
              <span className="px-4 py-2 rounded-full bg-orange-500 text-white shadow-lg flex items-center gap-2">
                <ChefHat className="w-4 h-4" />
                {recipe.chef}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Title and Description */}
          <div className="mb-6">
            <h2 className="text-gray-900 mb-3">{recipe.title}</h2>
            <p className="text-gray-600">{recipe.description}</p>
          </div>

          {/* Rating Section */}
          <div className="mb-6 p-6 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-900 mb-1">Calificación</p>
                {totalRatings > 0 && (
                  <p className="text-gray-600">
                    {averageRating.toFixed(1)} tenedores ({totalRatings} {totalRatings === 1 ? 'calificación' : 'calificaciones'})
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="transition-transform hover:scale-110"
                  >
                    <Utensils
                      className={`w-8 h-8 ${
                        star <= (hoverRating || userRating)
                          ? 'fill-orange-500 text-orange-500'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            {userRating > 0 && (
              <p className="text-orange-700">
                Tu calificación: {userRating} {userRating === 1 ? 'tenedor' : 'tenedores'}
              </p>
            )}
          </div>

          {/* Meta Info */}
          <div className="flex flex-wrap gap-6 mb-8 pb-8 border-b border-gray-200">
            <div className="flex items-center gap-2 text-gray-700">
              <Clock className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-gray-500">Preparación</p>
                <p>{recipe.prepTime}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Clock className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-gray-500">Cocción</p>
                <p>{recipe.cookTime}</p>
              </div>
            </div>
          </div>

          {/* Servings Calculator */}
          <div className="mb-8 p-6 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-orange-600" />
                <div>
                  <p className="text-gray-900">Calculadora de Porciones</p>
                  <p className="text-gray-600">
                    Ajusta las cantidades según necesites
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={handleDecreaseServings}
                  className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-orange-100 transition-colors shadow disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={servings <= 1}
                >
                  <Minus className="w-5 h-5 text-orange-600" />
                </button>
                <span className="text-gray-900 min-w-[4rem] text-center">
                  {servings} {servings === 1 ? 'porción' : 'porciones'}
                </span>
                <button
                  onClick={handleIncreaseServings}
                  className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-orange-100 transition-colors shadow"
                >
                  <Plus className="w-5 h-5 text-orange-600" />
                </button>
              </div>
            </div>
            {servingsMultiplier !== 1 && (
              <div className="mt-4 text-center text-orange-700">
                Las cantidades se han multiplicado por {servingsMultiplier.toFixed(1)}
              </div>
            )}
          </div>

          {/* Ingredients */}
          <div className="mb-8">
            <h3 className="text-gray-900 mb-4">Ingredientes</h3>
            <ul className="space-y-3">
              {recipe.ingredients.map((ingredient, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 text-gray-700 bg-gray-50 p-3 rounded-lg"
                >
                  <span className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span>{formatIngredient(ingredient)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Instructions */}
          <div className="mb-8">
            <h3 className="text-gray-900 mb-4">Instrucciones</h3>
            <ol className="space-y-4">
              {recipe.instructions.map((instruction, index) => (
                <li key={index} className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-600 text-white rounded-full flex items-center justify-center">
                    {index + 1}
                  </span>
                  <p className="text-gray-700 pt-1">{instruction}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* Comments Section */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle className="w-6 h-6 text-orange-600" />
              <h3 className="text-gray-900">
                Comentarios ({comments.length})
              </h3>
            </div>

            {/* Add Comment */}
            <div className="mb-6 bg-gray-50 p-4 rounded-lg">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Comparte tu experiencia con esta receta..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              />
              <button
                onClick={handleAddComment}
                disabled={loading || !newComment.trim()}
                className="mt-2 flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-lg hover:from-orange-600 hover:to-amber-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                Comentar
              </button>
            </div>

            {/* Comments List */}
            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No hay comentarios aún. ¡Sé el primero en comentar!
                </p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.key} className="bg-white border border-gray-200 p-4 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
                          {comment.userName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-gray-900 font-medium truncate block">{comment.userName}</span>
                          <span className="text-gray-500 text-sm">{formatDate(comment.createdAt)}</span>
                        </div>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteComment(comment.key)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 ml-2"
                          title="Eliminar comentario (Admin)"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    <p className="text-gray-700 ml-10 break-words">{comment.comment}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Category */}
          <div className="pt-8 border-t border-gray-200">
            <span className="inline-block px-4 py-2 bg-orange-50 text-orange-700 rounded-full">
              Categoría: {recipe.category}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}