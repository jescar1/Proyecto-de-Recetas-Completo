import { Search, Calculator, ChefHat, Smartphone, Clock, Eye, Utensils, MessageCircle } from 'lucide-react';

const features = [
  {
    icon: Search,
    title: 'Búsqueda Inteligente',
    description: 'Encuentra recetas por nombre, ingredientes o categoría',
  },
  {
    icon: Calculator,
    title: 'Calculadora de Porciones',
    description: 'Ajusta las cantidades según el número de comensales',
  },
  {
    icon: Utensils,
    title: 'Sistema de Calificaciones',
    description: 'Califica recetas con tenedores y ve opiniones de otros',
  },
  {
    icon: MessageCircle,
    title: 'Comentarios y Opiniones',
    description: 'Comparte tu experiencia y aprende de otros usuarios',
  },
  {
    icon: ChefHat,
    title: 'Recetas de Chefs',
    description: 'Aprende de profesionales con años de experiencia',
  },
  {
    icon: Clock,
    title: 'Tiempos Precisos',
    description: 'Información detallada de preparación y cocción',
  },
];

export function FeaturesSection() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-white rounded-2xl shadow-xl my-12">
      <div className="text-center mb-12">
        <h2 className="text-gray-900 mb-4">Características Destacadas</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Todo lo que necesitas para convertirte en un experto en la cocina
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <div
              key={index}
              className="text-center p-6 rounded-xl hover:bg-orange-50 transition-colors"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}