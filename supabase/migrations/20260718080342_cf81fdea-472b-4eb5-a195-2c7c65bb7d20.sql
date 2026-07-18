
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'staff');
CREATE TYPE public.product_status AS ENUM ('draft', 'published', 'archived');

-- ============ updated_at helper ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Role check helpers (SECURITY DEFINER — avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('owner','admin'));
$$;

-- ============ Profile & role policies ============
CREATE POLICY "profiles_self_select" ON public.profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_admin_select" ON public.profiles FOR SELECT
  TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "user_roles_self_select" ON public.user_roles FOR SELECT
  TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "user_roles_owner_manage" ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'owner'));

-- ============ Signup trigger: create profile + grant Owner to seed email ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, must_change_password)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name',''), false)
  ON CONFLICT (id) DO NOTHING;

  IF LOWER(NEW.email) = 'ghafoormotorssprt@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ TYRE PRODUCTS ============
CREATE TABLE public.tyre_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  size TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Passenger',
  price NUMERIC(10,2),
  currency TEXT NOT NULL DEFAULT 'PKR',
  in_stock BOOLEAN NOT NULL DEFAULT true,
  image_url TEXT,
  description TEXT,
  features TEXT[] NOT NULL DEFAULT '{}',
  vehicles TEXT[] NOT NULL DEFAULT '{}',
  status public.product_status NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tyre_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tyre_products TO authenticated;
GRANT ALL ON public.tyre_products TO service_role;
ALTER TABLE public.tyre_products ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_tyre_products_updated BEFORE UPDATE ON public.tyre_products
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Public sees ONLY published rows
CREATE POLICY "tyres_public_read_published" ON public.tyre_products FOR SELECT
  TO anon USING (status = 'published');
CREATE POLICY "tyres_auth_read_published" ON public.tyre_products FOR SELECT
  TO authenticated USING (status = 'published' OR public.is_admin(auth.uid()));

-- Admins manage
CREATE POLICY "tyres_admin_insert" ON public.tyre_products FOR INSERT
  TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "tyres_admin_update" ON public.tyre_products FOR UPDATE
  TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "tyres_admin_delete" ON public.tyre_products FOR DELETE
  TO authenticated USING (public.is_admin(auth.uid()));

CREATE INDEX idx_tyre_products_status ON public.tyre_products(status);
