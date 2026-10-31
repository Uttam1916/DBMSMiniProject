export interface User {
  user_id: number;
  name: string;
  email: string;
  role: 'STUDENT' | 'STAFF' | 'ADMIN';
}

export interface Category {
  category_id: number;
  name: string;
}

export interface Location {
  location_id: number;
  name: string;
}

export interface Item {
  item_id: number;
  title: string;
  description: string;
  item_type: 'LOST' | 'FOUND';
  item_date: string;
  status: 'OPEN' | 'CLAIMED' | 'RESOLVED' | 'CLOSED';
  has_embedding: boolean;
  embedding_dims: number | null;
  category_id: number;
  category_name: string;
  location_id: number;
  location_name: string;
  reporter_id: number;
  reporter_name: string;
  reporter_email: string;
  reporter_role: string;
  claims_count?: number;
}

export interface ItemMatch {
  lost_item_id: number;
  lost_title: string;
  lost_description: string;
  lost_status: string;
  lost_category: string;
  lost_location: string;
  lost_reporter: string;
  found_item_id: number;
  found_title: string;
  found_description: string;
  found_status: string;
  found_category: string;
  found_location: string;
  found_finder: string;
  similarity_score: number;
  match_status: 'SUGGESTED' | 'ACCEPTED' | 'REJECTED';
}

export interface Claim {
  claim_id: number;
  claim_date: string;
  proof_details: string;
  claim_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  claimant_id: number;
  claimant_name: string;
  claimant_email: string;
  claimant_role: string;
  item_id: number;
  item_title: string;
  item_description: string;
  item_type: string;
  item_status: string;
  category_name: string;
  location_name: string;
  finder_name: string;
}
