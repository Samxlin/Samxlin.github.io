export interface Publication {
  year: number;
  title: string;
  authors: string[];
  venue: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  pdf?: string;
  bibtex?: string;
  code?: string;
  selected: boolean;
  note?: string;
}

// Add only verified publication metadata. An empty state is intentionally shown
// until titles, authorship, venues, and links are confirmed.
export const publications: Publication[] = [];
