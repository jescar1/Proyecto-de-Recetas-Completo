import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const app = new Hono();

app.use('*', cors());
app.use('*', logger(console.log));

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Prefix for all routes
const prefix = '/make-server-dd414dcc';

// Helper to generate unique keys
function generateRecipeKey() {
  return `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Sign up endpoint
app.post(`${prefix}/signup`, async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, name, role } = body;

    if (!email || !password) {
      return c.json({ error: 'Email y contraseña son requeridos' }, 400);
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role: role || 'user' },
      email_confirm: true, // Auto-confirm email since email server hasn't been configured
    });

    if (error) {
      console.error('Error creating user during signup:', error);
      return c.json({ error: error.message }, 400);
    }

    return c.json({ success: true, user: data.user });
  } catch (error) {
    console.error('Unexpected error during signup:', error);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
});

// Update user role endpoint (for initial setup)
app.post(`${prefix}/update-user-role`, async (c) => {
  try {
    const body = await c.req.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return c.json({ error: 'User ID y role son requeridos' }, 400);
    }

    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { role },
    });

    if (error) {
      console.error('Error updating user role:', error);
      return c.json({ error: error.message }, 400);
    }

    return c.json({ success: true, user: data.user });
  } catch (error) {
    console.error('Unexpected error updating user role:', error);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
});

// Get all recipes
app.get(`${prefix}/recipes`, async (c) => {
  try {
    const recipes = await kv.getByPrefix('recipe_');
    
    // Get ratings for each recipe
    const recipesWithRatings = await Promise.all(
      recipes.map(async (recipe) => {
        const ratings = await kv.getByPrefix(`rating_${recipe.key}_`);
        const comments = await kv.getByPrefix(`comment_${recipe.key}_`);
        
        // Calculate average rating
        let averageRating = 0;
        if (ratings.length > 0) {
          const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
          averageRating = sum / ratings.length;
        }
        
        return {
          ...recipe,
          averageRating: Math.round(averageRating * 10) / 10,
          totalRatings: ratings.length,
          totalComments: comments.length,
        };
      })
    );
    
    return c.json(recipesWithRatings);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    return c.json({ error: 'Error al obtener recetas' }, 500);
  }
});

// Create new recipe (admin only)
app.post(`${prefix}/recipes`, async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'No autorizado' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user?.id) {
      console.error('Authorization error while creating recipe:', authError);
      return c.json({ error: 'No autorizado' }, 401);
    }

    // Check if user is admin
    if (user.user_metadata?.role !== 'admin') {
      return c.json({ error: 'Acceso denegado. Solo administradores pueden crear recetas' }, 403);
    }

    const body = await c.req.json();
    const {
      title,
      description,
      category,
      difficulty,
      image,
      ingredients,
      instructions,
      prepTime,
      cookTime,
      servings,
      chef,
    } = body;

    if (!title || !description || !category || !difficulty || !image || !ingredients || !instructions) {
      return c.json({ error: 'Todos los campos requeridos deben estar completos' }, 400);
    }

    const key = generateRecipeKey();
    const recipe = {
      key,
      title,
      description,
      category,
      difficulty,
      image,
      ingredients,
      instructions,
      prepTime,
      cookTime,
      servings,
      chef: chef || undefined,
      createdAt: new Date().toISOString(),
    };

    await kv.set(key, recipe);
    return c.json({ success: true, recipe });
  } catch (error) {
    console.error('Error creating recipe:', error);
    return c.json({ error: 'Error al crear receta' }, 500);
  }
});

// Update recipe (admin only)
app.put(`${prefix}/recipes/:key`, async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'No autorizado' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user?.id) {
      console.error('Authorization error while updating recipe:', authError);
      return c.json({ error: 'No autorizado' }, 401);
    }

    // Check if user is admin
    if (user.user_metadata?.role !== 'admin') {
      return c.json({ error: 'Acceso denegado. Solo administradores pueden modificar recetas' }, 403);
    }

    const key = c.req.param('key');
    const existingRecipe = await kv.get(key);

    if (!existingRecipe) {
      return c.json({ error: 'Receta no encontrada' }, 404);
    }

    const body = await c.req.json();
    const {
      title,
      description,
      category,
      difficulty,
      image,
      ingredients,
      instructions,
      prepTime,
      cookTime,
      servings,
      chef,
    } = body;

    const updatedRecipe = {
      ...existingRecipe,
      title,
      description,
      category,
      difficulty,
      image,
      ingredients,
      instructions,
      prepTime,
      cookTime,
      servings,
      chef: chef || undefined,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(key, updatedRecipe);
    return c.json({ success: true, recipe: updatedRecipe });
  } catch (error) {
    console.error('Error updating recipe:', error);
    return c.json({ error: 'Error al actualizar receta' }, 500);
  }
});

// Delete recipe (admin only)
app.delete(`${prefix}/recipes/:key`, async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'No autorizado' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user?.id) {
      console.error('Authorization error while deleting recipe:', authError);
      return c.json({ error: 'No autorizado' }, 401);
    }

    // Check if user is admin
    if (user.user_metadata?.role !== 'admin') {
      return c.json({ error: 'Acceso denegado. Solo administradores pueden eliminar recetas' }, 403);
    }

    const key = c.req.param('key');
    const existingRecipe = await kv.get(key);

    if (!existingRecipe) {
      return c.json({ error: 'Receta no encontrada' }, 404);
    }

    await kv.del(key);
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    return c.json({ error: 'Error al eliminar receta' }, 500);
  }
});

// Initialize with sample recipes
app.post(`${prefix}/init-recipes`, async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'No autorizado' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user?.id) {
      return c.json({ error: 'No autorizado' }, 401);
    }

    if (user.user_metadata?.role !== 'admin') {
      return c.json({ error: 'Acceso denegado' }, 403);
    }

    // Check if recipes already exist
    const existingRecipes = await kv.getByPrefix('recipe_');
    if (existingRecipes.length > 0) {
      return c.json({ message: 'Las recetas ya están inicializadas' });
    }

    const sampleRecipes = [
      {
        key: generateRecipeKey(),
        title: 'Pasta Carbonara Clásica',
        description: 'Una deliciosa pasta italiana con una salsa cremosa de huevo y panceta',
        category: 'Pasta',
        difficulty: 'Media',
        image: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800',
        ingredients: [
          '400g de espagueti',
          '200g de panceta o guanciale',
          '4 huevos',
          '100g de queso parmesano rallado',
          'Pimienta negra al gusto',
          'Sal al gusto',
        ],
        instructions: [
          'Cocina la pasta en agua con sal hasta que esté al dente',
          'Corta la panceta en cubos pequeños y cocínala hasta que esté crujiente',
          'Bate los huevos con el queso parmesano y pimienta',
          'Escurre la pasta y mézclala con la panceta',
          'Retira del fuego y agrega la mezcla de huevo, mezclando rápidamente',
          'Sirve inmediatamente con más queso y pimienta',
        ],
        prepTime: '10 min',
        cookTime: '20 min',
        servings: 4,
        chef: 'Mario Rossi',
      },
      {
        key: generateRecipeKey(),
        title: 'Ensalada César con Pollo',
        description: 'Fresca ensalada romana con pollo a la parrilla y aderezo César casero',
        category: 'Ensaladas',
        difficulty: 'Fácil',
        image: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=800',
        ingredients: [
          '2 pechugas de pollo',
          '1 lechuga romana grande',
          '100g de queso parmesano',
          'Crutones al gusto',
          '3 cucharadas de mayonesa',
          '1 diente de ajo',
          'Jugo de medio limón',
          'Anchoas (opcional)',
        ],
        instructions: [
          'Sazona y cocina el pollo a la parrilla hasta que esté dorado',
          'Corta el pollo en tiras',
          'Lava y corta la lechuga',
          'Prepara el aderezo mezclando mayonesa, ajo, limón y anchoas',
          'Mezcla la lechuga con el aderezo',
          'Agrega el pollo, parmesano y crutones',
        ],
        prepTime: '15 min',
        cookTime: '15 min',
        servings: 4,
        chef: 'Laura García',
      },
      {
        key: generateRecipeKey(),
        title: 'Brownie de Chocolate',
        description: 'Postre decadente de chocolate con textura perfecta, crujiente por fuera y suave por dentro',
        category: 'Postres',
        difficulty: 'Fácil',
        image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800',
        ingredients: [
          '200g de chocolate negro',
          '150g de mantequilla',
          '3 huevos',
          '200g de azúcar',
          '100g de harina',
          '1 cucharadita de extracto de vainilla',
          'Pizca de sal',
        ],
        instructions: [
          'Precalienta el horno a 180°C',
          'Derrite el chocolate con la mantequilla a baño maría',
          'Bate los huevos con el azúcar hasta que estén espumosos',
          'Agrega el chocolate derretido y mezcla',
          'Incorpora la harina, vainilla y sal',
          'Vierte en un molde engrasado y hornea por 25-30 minutos',
        ],
        prepTime: '15 min',
        cookTime: '30 min',
        servings: 8,
        chef: 'Carlos Martínez',
      },
      {
        key: generateRecipeKey(),
        title: 'Estofado de Carne',
        description: 'Guiso tradicional con carne tierna y vegetales en salsa rica',
        category: 'Guisos',
        difficulty: 'Media',
        image: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=800',
        ingredients: [
          '1kg de carne para guisar',
          '3 zanahorias',
          '2 cebollas',
          '3 papas',
          '2 tomates',
          '2 dientes de ajo',
          '1 litro de caldo de carne',
          'Aceite de oliva',
          'Sal, pimienta y hierbas al gusto',
        ],
        instructions: [
          'Sella la carne en una olla con aceite caliente',
          'Retira la carne y sofríe la cebolla y el ajo',
          'Agrega los tomates picados y cocina por 5 minutos',
          'Devuelve la carne a la olla',
          'Agrega el caldo y hierve a fuego lento por 1 hora',
          'Añade las zanahorias y papas, cocina 30 minutos más',
        ],
        prepTime: '20 min',
        cookTime: '90 min',
        servings: 6,
      },
      {
        key: generateRecipeKey(),
        title: 'Sopa de Tomate Casera',
        description: 'Reconfortante sopa de tomate con albahaca fresca',
        category: 'Sopas',
        difficulty: 'Fácil',
        image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800',
        ingredients: [
          '1kg de tomates maduros',
          '1 cebolla',
          '2 dientes de ajo',
          '500ml de caldo de vegetales',
          'Albahaca fresca',
          'Aceite de oliva',
          'Sal y pimienta',
          'Crema para servir (opcional)',
        ],
        instructions: [
          'Sofríe la cebolla y el ajo en aceite de oliva',
          'Agrega los tomates picados y cocina por 10 minutos',
          'Añade el caldo y hierve por 20 minutos',
          'Licúa la sopa hasta obtener textura suave',
          'Sazona con sal, pimienta y albahaca',
          'Sirve caliente con un toque de crema',
        ],
        prepTime: '10 min',
        cookTime: '30 min',
        servings: 4,
        chef: 'Ana López',
      },
      {
        key: generateRecipeKey(),
        title: 'Filete a la Parrilla',
        description: 'Jugoso filete de res con vegetales asados',
        category: 'Carnes',
        difficulty: 'Media',
        image: 'https://images.unsplash.com/photo-1504973960431-1c467e159aa4?w=800',
        ingredients: [
          '4 filetes de res (200g cada uno)',
          '2 pimientos',
          '2 calabacines',
          'Aceite de oliva',
          'Sal gruesa',
          'Pimienta negra',
          'Romero fresco',
          'Mantequilla',
        ],
        instructions: [
          'Saca los filetes del refrigerador 30 minutos antes',
          'Sazona los filetes con sal gruesa y pimienta',
          'Calienta la parrilla a fuego alto',
          'Cocina los filetes 4 minutos por lado para término medio',
          'Deja reposar 5 minutos antes de servir',
          'Asa los vegetales cortados hasta que estén tiernos',
        ],
        prepTime: '15 min',
        cookTime: '15 min',
        servings: 4,
        chef: 'Roberto Fernández',
      },
    ];

    for (const recipe of sampleRecipes) {
      await kv.set(recipe.key, recipe);
    }

    return c.json({ success: true, message: 'Recetas de ejemplo creadas', count: sampleRecipes.length });
  } catch (error) {
    console.error('Error initializing recipes:', error);
    return c.json({ error: 'Error al inicializar recetas' }, 500);
  }
});

// Add rating to a recipe
app.post(`${prefix}/recipes/:key/rating`, async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'No autorizado' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user?.id) {
      console.error('Authorization error while rating recipe:', authError);
      return c.json({ error: 'No autorizado' }, 401);
    }

    const recipeKey = c.req.param('key');
    const body = await c.req.json();
    const { rating } = body;

    if (!rating || rating < 1 || rating > 5) {
      return c.json({ error: 'La calificación debe ser entre 1 y 5' }, 400);
    }

    const recipe = await kv.get(recipeKey);
    if (!recipe) {
      return c.json({ error: 'Receta no encontrada' }, 404);
    }

    // Store or update user's rating
    const ratingKey = `rating_${recipeKey}_${user.id}`;
    const ratingData = {
      recipeKey,
      userId: user.id,
      userName: user.user_metadata?.name || user.email,
      rating,
      createdAt: new Date().toISOString(),
    };

    await kv.set(ratingKey, ratingData);
    return c.json({ success: true, rating: ratingData });
  } catch (error) {
    console.error('Error adding rating:', error);
    return c.json({ error: 'Error al calificar receta' }, 500);
  }
});

// Get comments for a recipe
app.get(`${prefix}/recipes/:key/comments`, async (c) => {
  try {
    const recipeKey = c.req.param('key');
    const comments = await kv.getByPrefix(`comment_${recipeKey}_`);
    
    // Sort by date (newest first)
    comments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return c.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    return c.json({ error: 'Error al obtener comentarios' }, 500);
  }
});

// Add comment to a recipe
app.post(`${prefix}/recipes/:key/comments`, async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'No autorizado' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user?.id) {
      console.error('Authorization error while commenting on recipe:', authError);
      return c.json({ error: 'No autorizado' }, 401);
    }

    const recipeKey = c.req.param('key');
    const body = await c.req.json();
    const { comment } = body;

    if (!comment || comment.trim() === '') {
      return c.json({ error: 'El comentario no puede estar vacío' }, 400);
    }

    const recipe = await kv.get(recipeKey);
    if (!recipe) {
      return c.json({ error: 'Receta no encontrada' }, 404);
    }

    // Store comment
    const commentKey = `comment_${recipeKey}_${Date.now()}_${user.id}`;
    const commentData = {
      key: commentKey,
      recipeKey,
      userId: user.id,
      userName: user.user_metadata?.name || user.email,
      comment,
      createdAt: new Date().toISOString(),
    };

    await kv.set(commentKey, commentData);
    return c.json({ success: true, comment: commentData });
  } catch (error) {
    console.error('Error adding comment:', error);
    return c.json({ error: 'Error al agregar comentario' }, 500);
  }
});

// Get user's rating for a recipe
app.get(`${prefix}/recipes/:key/my-rating`, async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ rating: null });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user?.id) {
      return c.json({ rating: null });
    }

    const recipeKey = c.req.param('key');
    const ratingKey = `rating_${recipeKey}_${user.id}`;
    const rating = await kv.get(ratingKey);
    
    return c.json({ rating: rating?.rating || null });
  } catch (error) {
    console.error('Error fetching user rating:', error);
    return c.json({ rating: null });
  }
});

Deno.serve(app.fetch);