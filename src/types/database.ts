export type UserRole = 'user' | 'admin';
export type KYCStatus = 'pending' | 'approved' | 'rejected';
export type ShipmentStatus = 'pending' | 'accepted' | 'in_transit' | 'delivered' | 'cancelled';

export interface UserProfile {
    id: string;
    full_name: string | null;
    phone_number: string | null;
    avatar_url: string | null;
    is_kyc_verified: boolean;
    trust_score: number;
    role: UserRole;
    wallet_balance: number;
    escrow_balance: number;
    average_rating: number;
    total_ratings: number;
    is_suspended: boolean;
    created_at: string;
}

export interface Shipment {
    id: string;
    sender_id: string;
    traveler_id: string | null;
    title: string;
    description: string | null;
    weight_kg: number | null;
    image_url: string | null;
    image_urls: string[] | null;
    pickup_address: string | null;
    pickup_location: any; // PostGIS point
    dropoff_address: string | null;
    dropoff_location: any; // PostGIS point
    status: ShipmentStatus;
    offer_price: number;
    pickup_otp?: string;
    delivery_otp?: string;
    cancelled_at?: string | null;
    cancelled_by?: string | null;
    cancellation_penalty?: number | null;
    bidding_enabled?: boolean;
    auto_accept_initial_price?: boolean;
    accepted_bid_id?: string | null;
    created_at: string;
    delivered_at?: string | null;
}

export interface KYCDocument {
    id: string;
    user_id: string;
    document_type?: string;
    document_url: string;
    document_url_back?: string;
    proof_of_address_url?: string;
    status: KYCStatus;
    admin_note: string | null;
    created_at: string;
}

export interface Rating {
    id: string;
    shipment_id: string;
    sender_id: string;
    traveler_id: string;
    rating: number;
    comment: string | null;
    created_at: string;
}

export interface Message {
    id: string;
    shipment_id: string;
    sender_id: string;
    receiver_id: string;
    content: string;
    created_at: string;
    updated_at: string;
    is_read: boolean;
}

export interface BusinessWallet {
    id: string;
    balance: number;
    total_earned: number;
    total_withdrawn: number;
    created_at: string;
    updated_at: string;
}

export interface BusinessWalletTransaction {
    id: string;
    shipment_id: string | null;
    amount: number;
    type: 'commission' | 'withdrawal';
    description: string;
    created_at: string;
}
