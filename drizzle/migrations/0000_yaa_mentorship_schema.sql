-- Enums
CREATE TYPE public.app_role AS ENUM ('admin');
CREATE TYPE public.pricing_type AS ENUM ('pro_bono', 'paid');
CREATE TYPE public.duration_type AS ENUM ('weekly', 'monthly', 'six_months', 'yearly');
CREATE TYPE public.request_status AS ENUM ('pending', 'accepted', 'declined', 'cancelled');
CREATE TYPE public.match_status AS ENUM ('pending_payment', 'active', 'completed', 'ended_early');
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'failed');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  avatar_url TEXT,
  is_mentor BOOLEAN NOT NULL DEFAULT false,
  is_mentee BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are publicly readable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Mentor details
CREATE TABLE public.mentor_details (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  headline TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  expertise TEXT[] NOT NULL DEFAULT '{}',
  pricing public.pricing_type NOT NULL DEFAULT 'pro_bono',
  rate_description TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentor_details TO authenticated;
GRANT SELECT ON public.mentor_details TO anon;
GRANT ALL ON public.mentor_details TO service_role;
ALTER TABLE public.mentor_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published mentors are public" ON public.mentor_details FOR SELECT USING (is_published OR auth.uid() = user_id);
CREATE POLICY "Mentors insert own details" ON public.mentor_details FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Mentors update own details" ON public.mentor_details FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Match requests
CREATE TABLE public.match_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL DEFAULT '',
  proposed_duration public.duration_type NOT NULL,
  status public.request_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.match_requests TO authenticated;
GRANT ALL ON public.match_requests TO service_role;
ALTER TABLE public.match_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read requests" ON public.match_requests FOR SELECT TO authenticated USING (auth.uid() = mentee_id OR auth.uid() = mentor_id);
CREATE POLICY "Mentee creates request" ON public.match_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = mentee_id AND mentee_id <> mentor_id);
CREATE POLICY "Participants update request" ON public.match_requests FOR UPDATE TO authenticated USING (auth.uid() = mentee_id OR auth.uid() = mentor_id);

-- Matches
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES public.match_requests(id) ON DELETE SET NULL,
  mentor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mentee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  duration public.duration_type NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  status public.match_status NOT NULL DEFAULT 'pending_payment',
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.matches TO authenticated;
GRANT ALL ON public.matches TO service_role;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read matches" ON public.matches FOR SELECT TO authenticated USING (auth.uid() = mentor_id OR auth.uid() = mentee_id);
CREATE POLICY "Mentor creates match" ON public.matches FOR INSERT TO authenticated WITH CHECK (auth.uid() = mentor_id);
CREATE POLICY "Participants update match" ON public.matches FOR UPDATE TO authenticated USING (auth.uid() = mentor_id OR auth.uid() = mentee_id);

-- Messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX messages_match_idx ON public.messages (match_id, created_at);
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Match participants read messages" ON public.messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id AND (m.mentor_id = auth.uid() OR m.mentee_id = auth.uid()))
);
CREATE POLICY "Match participants send messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (
  sender_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.matches m WHERE m.id = match_id AND m.status = 'active' AND (m.mentor_id = auth.uid() OR m.mentee_id = auth.uid())
  )
);
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Ratings
CREATE TABLE public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL UNIQUE REFERENCES public.matches(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mentee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  review TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ratings TO authenticated;
GRANT SELECT ON public.ratings TO anon;
GRANT ALL ON public.ratings TO service_role;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ratings are public" ON public.ratings FOR SELECT USING (true);
CREATE POLICY "Mentee rates completed match" ON public.ratings FOR INSERT TO authenticated WITH CHECK (
  mentee_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.matches m WHERE m.id = match_id AND m.mentee_id = auth.uid() AND m.mentor_id = ratings.mentor_id
      AND m.status IN ('completed', 'ended_early')
  )
);

-- Payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  mentee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reference TEXT NOT NULL UNIQUE,
  amount_cents INTEGER NOT NULL DEFAULT 300,
  status public.payment_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mentee reads own payments" ON public.payments FOR SELECT TO authenticated USING (mentee_id = auth.uid());

-- Admin read-all policies
CREATE POLICY "Admins read all matches" ON public.matches FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read all payments" ON public.payments FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read all requests" ON public.match_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Auto profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
