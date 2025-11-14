import type { CaseCategoryOption, CaseRecord } from './types';

export const CASE_CATEGORIES: CaseCategoryOption[] = [
  {
    key: 'amministrativo',
    label: 'AMMINISTRATIVO',
    subOptions: [
      { key: 'sequestri', label: 'SEQUESTRI ART. 8' },
      { key: 'sives', label: 'SIVES' },
    ],
  },
  {
    key: 'penale',
    label: 'PENALE',
    subOptions: [
      { key: 'penale_generale', label: 'PENALE GENERALE' },
    ],
  },
];

export const DEFAULT_CATEGORY_KEY = CASE_CATEGORIES[0]?.key ?? 'amministrativo';
export const DEFAULT_SUBCATEGORY_KEY =
  CASE_CATEGORIES[0]?.subOptions?.[0]?.key ?? null;

export function deriveProcedureMeta(
  categoryKey: string,
  subCategoryKey: string | null
): {
  procedureType: string;
  subCategoryLabel: string | null;
} {
  const category =
    CASE_CATEGORIES.find((item) => item.key === categoryKey) ?? CASE_CATEGORIES[0];
  const subOption = category?.subOptions?.find((item) => item.key === subCategoryKey);

  return {
    procedureType: category.key,
    subCategoryLabel: subOption?.label ?? (category.subOptions ? null : category.label),
  };
}

export function deriveCategoryFromCase(record: CaseRecord): {
  categoryKey: string;
  subCategoryKey: string | null;
} {
  const procedureKey = record.procedure_type?.toLowerCase?.() ?? DEFAULT_CATEGORY_KEY;

  const category =
    CASE_CATEGORIES.find((item) => item.key === procedureKey) ?? CASE_CATEGORIES[0];

  if (!category.subOptions || category.subOptions.length === 0) {
    return { categoryKey: category.key, subCategoryKey: null };
  }

  const normalizedSub = record.subcategory ?? '';
  const subOption =
    category.subOptions.find(
      (item) =>
        item.key === normalizedSub ||
        item.label.toLowerCase() === normalizedSub.toLowerCase()
    ) ?? category.subOptions[0];

  return {
    categoryKey: category.key,
    subCategoryKey: subOption.key,
  };
}

