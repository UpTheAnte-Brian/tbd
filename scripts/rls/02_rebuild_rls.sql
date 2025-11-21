--------------------------------------------------------------------
-- 02_rebuild_rls.sql
-- Recreate all RLS policies exactly as in DEV (from test1.json)
--------------------------------------------------------------------

-------------------------
-- TABLE: channels
-------------------------
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authorized delete access"
  ON public.channels FOR DELETE TO public
  USING (authorize('channels.delete'::app_permission));

CREATE POLICY "Allow individual delete access"
  ON public.channels FOR DELETE TO public
  USING ((auth.uid() = created_by));

CREATE POLICY "Allow individual insert access"
  ON public.channels FOR INSERT TO public
  WITH CHECK ((auth.uid() = created_by));

CREATE POLICY "Allow logged-in read access"
  ON public.channels FOR SELECT TO public
  USING ((auth.role() = 'authenticated'));

-------------------------
-- TABLE: district_metadata
-------------------------
ALTER TABLE public.district_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select metadata"
  ON public.district_metadata FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Everyone can see district metadata table"
  ON public.district_metadata FOR SELECT TO public
  USING (true);

-------------------------
-- TABLE: district_users
-------------------------
ALTER TABLE public.district_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own district_users"
  ON public.district_users FOR SELECT TO public
  USING (user_id = auth.uid());

CREATE POLICY "district_users_admin_delete"
  ON public.district_users FOR DELETE TO public
  USING (
    (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    OR
    (EXISTS (
      SELECT 1 FROM district_users du2
      WHERE du2.user_id = auth.uid()
        AND du2.district_id = district_users.district_id
        AND du2.role = 'admin'
    ))
  );

CREATE POLICY "district_users_admin_insert"
  ON public.district_users FOR INSERT TO public
  WITH CHECK (
    (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    OR
    (EXISTS (
      SELECT 1 FROM district_users du2
      WHERE du2.user_id = auth.uid()
        AND du2.district_id = district_users.district_id
        AND du2.role = 'admin'
    ))
  );

CREATE POLICY "district_users_admin_update"
  ON public.district_users FOR UPDATE TO public
  USING (
    (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    OR
    (EXISTS (
      SELECT 1 FROM district_users du2
      WHERE du2.user_id = auth.uid()
        AND du2.district_id = district_users.district_id
        AND du2.role = 'admin'
    ))
  )
  WITH CHECK (
    (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    OR
    (EXISTS (
      SELECT 1 FROM district_users du2
      WHERE du2.user_id = auth.uid()
        AND du2.district_id = district_users.district_id
        AND du2.role = 'admin'
    ))
  );

CREATE POLICY "district_users_public_select"
  ON public.district_users FOR SELECT TO authenticated
  USING (true);

-------------------------
-- TABLE: districts
-------------------------
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can see district table"
  ON public.districts FOR SELECT TO public
  USING (true);

-------------------------
-- TABLE: foundations
-------------------------
ALTER TABLE public.foundations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_insert"
  ON public.foundations FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "admin_update"
  ON public.foundations FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "public_select"
  ON public.foundations FOR SELECT TO public
  USING (true);

-------------------------
-- TABLE: messages
-------------------------
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authorized delete access"
  ON public.messages FOR DELETE TO public
  USING (authorize('messages.delete'::app_permission));

CREATE POLICY "Allow individual delete access"
  ON public.messages FOR DELETE TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Allow individual insert access"
  ON public.messages FOR INSERT TO public
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow individual update access"
  ON public.messages FOR UPDATE TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Allow logged-in read access"
  ON public.messages FOR SELECT TO public
  USING ((auth.role() = 'authenticated'));

-------------------------
-- TABLE: profiles
-------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users and admins to insert profiles"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = id) OR ((auth.jwt() ->> 'role') = 'admin'));

CREATE POLICY "Allow users and admins to update profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING ((auth.uid() = id) OR ((auth.jwt() ->> 'role') = 'admin'))
  WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT TO public
  USING (true);

CREATE POLICY "Users can insert own profile; admins any"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = id) OR ((auth.jwt() ->> 'role') = 'admin'));

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING ((auth.uid() = id) OR ((auth.jwt() ->> 'role') = 'admin'));

-------------------------
-- TABLE: todos
-------------------------
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Individuals can create todos."
  ON public.todos FOR INSERT TO public
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Individuals can delete their own todos."
  ON public.todos FOR DELETE TO public
  USING ((auth.uid()) = user_id);

CREATE POLICY "Individuals can update their own todos."
  ON public.todos FOR UPDATE TO public
  USING ((auth.uid()) = user_id);

CREATE POLICY "Individuals can view their own todos."
  ON public.todos FOR SELECT TO public
  USING ((auth.uid()) = user_id);

-------------------------
-- TABLE: storage.objects
-------------------------
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to crud logos 1peuqw_0"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'logos');

CREATE POLICY "Allow users to crud logos 1peuqw_1"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'logos');

CREATE POLICY "Allow users to crud logos 1peuqw_2"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'logos');

CREATE POLICY "Allow users to crud logos 1peuqw_3"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'logos');

CREATE POLICY "Anyone can upload an avatar."
  ON storage.objects FOR INSERT TO public
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Avatar images are publicly accessible."
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');