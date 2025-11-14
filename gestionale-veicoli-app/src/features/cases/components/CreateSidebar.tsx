import type { CaseCategoryOption } from '../types';

type CreateSidebarProps = {
  categories: CaseCategoryOption[];
  selectedCategoryKey: string;
  selectedSubCategoryKey: string | null;
  onSelectCategory: (key: string) => void;
  onSelectSubCategory: (key: string | null) => void;
};

export function CreateSidebar({
  categories,
  selectedCategoryKey,
  selectedSubCategoryKey,
  onSelectCategory,
  onSelectSubCategory,
}: CreateSidebarProps) {
  return (
    <aside className="create-sidebar">
      <div>
        <h3>Tipologie pratica</h3>
        <p>Seleziona la categoria per mostrare i campi dedicati e gli automatismi.</p>
      </div>
      <ul className="create-menu">
        {categories.map((category) => {
          const isActive = category.key === selectedCategoryKey;
          const hasSubMenu = category.subOptions && category.subOptions.length > 0;
          return (
            <li key={category.key}>
              <button
                type="button"
                className={`create-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  onSelectCategory(category.key);
                  if (!hasSubMenu) {
                    onSelectSubCategory(null);
                  } else if (
                    hasSubMenu &&
                    (!category.subOptions?.some((sub) => sub.key === selectedSubCategoryKey) ||
                      selectedSubCategoryKey === null)
                  ) {
                    onSelectSubCategory(category.subOptions?.[0]?.key ?? null);
                  }
                }}
              >
                <span>{category.label}</span>
                {!hasSubMenu && <small>Funzione diretta</small>}
              </button>

              {hasSubMenu && isActive && (
                <div className="create-submenu">
                  {category.subOptions?.map((sub) => (
                    <button
                      type="button"
                      key={sub.key}
                      className={`create-subitem ${
                        sub.key === selectedSubCategoryKey ? 'active' : ''
                      }`}
                      onClick={() => onSelectSubCategory(sub.key)}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

