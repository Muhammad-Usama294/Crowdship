-- Create ratings table for traveler reviews
CREATE TABLE IF NOT EXISTS public.ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID REFERENCES public.shipments(id) ON DELETE CASCADE NOT NULL UNIQUE,
  sender_id UUID REFERENCES public.users(id) NOT NULL,
  traveler_id UUID REFERENCES public.users(id) NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add rating statistics to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(2,1) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0;

-- Enable RLS
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- Senders can create ratings for their delivered shipments
CREATE POLICY "Senders can rate their delivered shipments" ON public.ratings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shipments
      WHERE id = shipment_id
      AND sender_id = auth.uid()
      AND status = 'delivered'
    )
  );

-- Everyone can view ratings
CREATE POLICY "Anyone can view ratings" ON public.ratings
  FOR SELECT
  USING (true);

-- Create function to update traveler rating stats
CREATE OR REPLACE FUNCTION update_traveler_rating_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate average rating and total for the traveler
  UPDATE public.users
  SET 
    average_rating = (SELECT AVG(rating) FROM public.ratings WHERE traveler_id = NEW.traveler_id),
    total_ratings = (SELECT COUNT(*) FROM public.ratings WHERE traveler_id = NEW.traveler_id)
  WHERE id = NEW.traveler_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-update stats when rating is added
CREATE TRIGGER trigger_update_rating_stats
AFTER INSERT ON public.ratings
FOR EACH ROW
EXECUTE FUNCTION update_traveler_rating_stats();

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_ratings_traveler ON public.ratings(traveler_id);
CREATE INDEX IF NOT EXISTS idx_ratings_shipment ON public.ratings(shipment_id);
