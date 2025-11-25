interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onSelectCategory(category)}
          className={`px-6 py-2 rounded-full transition-all ${
            selectedCategory === category
              ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg'
              : 'bg-white text-gray-700 hover:bg-gray-50 shadow'
          }`}
        >
          {category}
        </button>
      ))}
    </div>
  );
}
