-- =====================================================
-- SCHEMA SQL POUR SUPABASE
-- Système de Gestion d'Association Veuves et Orphelins
-- =====================================================

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: profiles
-- Extension de auth.users avec rôles et informations supplémentaires
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'président', 'vice-président', 'secrétaire', 'trésorier', 'conseiller', 'gestionnaire', 'membre', 'donateur', 'beneficiaire')),
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLE: veuves
-- Informations complètes sur les veuves
-- =====================================================
CREATE TABLE IF NOT EXISTS public.veuves (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Informations générales
    nom_complet TEXT NOT NULL,
    numero_identification TEXT UNIQUE NOT NULL, -- N° B.I ou équivalent
    telephone TEXT,
    ville TEXT,
    adresse_residence TEXT,
    date_naissance DATE,
    sexe TEXT DEFAULT 'Femme',
    situation_professionnelle TEXT,
    niveau_scolaire TEXT,
    date_adhesion DATE DEFAULT CURRENT_DATE,
    
    -- Situation familiale
    nom_mari_decede TEXT,
    date_deces DATE,
    cause_deces TEXT,
    nombre_enfants INTEGER DEFAULT 0,
    nombre_enfants_orphelins INTEGER DEFAULT 0,
    nombre_enfants_autre_mariage INTEGER DEFAULT 0,
    
    -- Situation économique
    revenu_mensuel DECIMAL(10, 2),
    type_logement TEXT,
    montant_loyer_mensuel DECIMAL(10, 2),
    pension_retraite BOOLEAN DEFAULT FALSE,
    montant_pension_retraite DECIMAL(10, 2),
    soutien_social_direct BOOLEAN DEFAULT FALSE,
    montant_soutien_social DECIMAL(10, 2),
    aide_financiere_supplementaire BOOLEAN DEFAULT FALSE,
    montant_aide_supplementaire DECIMAL(10, 2),
    couverture_sante BOOLEAN DEFAULT FALSE,
    
    -- Métadonnées
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLE: orphelins
-- Informations sur les orphelins liés aux veuves
-- =====================================================
CREATE TABLE IF NOT EXISTS public.orphelins (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Informations personnelles
    nom_complet TEXT NOT NULL,
    nom_pere TEXT,
    id_mere UUID REFERENCES public.veuves(id) ON DELETE CASCADE, -- Lien avec la veuve
    ville TEXT,
    sexe TEXT CHECK (sexe IN ('Garçon', 'Fille')),
    date_naissance DATE,
    age INTEGER, -- Calculé automatiquement
    niveau_scolaire TEXT,
    date_inscription DATE DEFAULT CURRENT_DATE,
    
    -- Santé
    maladie_chronique BOOLEAN DEFAULT FALSE,
    type_maladie TEXT,
    handicap BOOLEAN DEFAULT FALSE,
    type_handicap TEXT,
    
    -- Statut orphelin
    orphelin_pere BOOLEAN DEFAULT TRUE,
    orphelin_mere BOOLEAN DEFAULT FALSE,
    
    -- Notes
    notes_specifiques TEXT,
    
    -- Métadonnées
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLE: programmes_aide
-- Types de programmes d'aide disponibles
-- =====================================================
CREATE TABLE IF NOT EXISTS public.programmes_aide (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nom_programme TEXT NOT NULL,
    type_aide TEXT NOT NULL CHECK (type_aide IN ('financiere', 'scolaire', 'alimentaire', 'medicale')),
    description TEXT,
    montant_standard DECIMAL(10, 2),
    actif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLE: attributions_aide
-- Historique des aides attribuées
-- =====================================================
CREATE TABLE IF NOT EXISTS public.attributions_aide (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    id_programme UUID REFERENCES public.programmes_aide(id) ON DELETE CASCADE,
    
    -- Bénéficiaire (veuve OU orphelin)
    id_veuve UUID REFERENCES public.veuves(id) ON DELETE CASCADE,
    id_orphelin UUID REFERENCES public.orphelins(id) ON DELETE CASCADE,
    
    -- Détails de l'aide
    montant DECIMAL(10, 2) NOT NULL,
    date_attribution DATE DEFAULT CURRENT_DATE,
    statut TEXT DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'approuvee', 'versee', 'annulee')),
    notes TEXT,
    
    -- Métadonnées
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Contrainte: au moins un bénéficiaire
    CHECK (id_veuve IS NOT NULL OR id_orphelin IS NOT NULL)
);

-- =====================================================
-- TABLE: dons
-- Enregistrement des donations
-- =====================================================
CREATE TABLE IF NOT EXISTS public.dons (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Donateur
    nom_donateur TEXT NOT NULL,
    email_donateur TEXT,
    telephone_donateur TEXT,
    id_donateur UUID REFERENCES public.profiles(id), -- Si le donateur a un compte
    
    -- Détails du don
    montant DECIMAL(10, 2) NOT NULL,
    annee_don INTEGER NOT NULL, -- Remplace date_don
    type_don TEXT DEFAULT 'monetaire' CHECK (type_don IN ('monetaire', 'nature', 'service')),
    nature_don TEXT, -- Adhésion, Zakat, Sadaqa, etc.
    devise TEXT DEFAULT 'DH',
    pays TEXT,
    description TEXT,

    -- Adhésion mapping (si applicable)
    adhesion_annuelle BOOLEAN DEFAULT FALSE,
    adhesion_jan BOOLEAN DEFAULT FALSE,
    adhesion_feb BOOLEAN DEFAULT FALSE,
    adhesion_mar BOOLEAN DEFAULT FALSE,
    adhesion_apr BOOLEAN DEFAULT FALSE,
    adhesion_may BOOLEAN DEFAULT FALSE,
    adhesion_jun BOOLEAN DEFAULT FALSE,
    adhesion_jul BOOLEAN DEFAULT FALSE,
    adhesion_aug BOOLEAN DEFAULT FALSE,
    adhesion_sep BOOLEAN DEFAULT FALSE,
    adhesion_oct BOOLEAN DEFAULT FALSE,
    adhesion_nov BOOLEAN DEFAULT FALSE,
    adhesion_dec BOOLEAN DEFAULT FALSE,
    
    -- Métadonnées
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TRIGGERS POUR UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_veuves_updated_at BEFORE UPDATE ON public.veuves
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orphelins_updated_at BEFORE UPDATE ON public.orphelins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_programmes_aide_updated_at BEFORE UPDATE ON public.programmes_aide
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attributions_aide_updated_at BEFORE UPDATE ON public.attributions_aide
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dons_updated_at BEFORE UPDATE ON public.dons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TRIGGER POUR CALCULER L'ÂGE AUTOMATIQUEMENT
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_age()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.date_naissance IS NOT NULL THEN
        NEW.age = EXTRACT(YEAR FROM AGE(NEW.date_naissance));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_orphelin_age BEFORE INSERT OR UPDATE ON public.orphelins
    FOR EACH ROW EXECUTE FUNCTION calculate_age();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Activer RLS sur toutes les tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veuves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orphelins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programmes_aide ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attributions_aide ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dons ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLICIES: profiles
-- =====================================================
-- Les utilisateurs peuvent voir leur propre profil
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Les admins peuvent tout voir
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Les admins peuvent tout modifier
CREATE POLICY "Admins can update all profiles" ON public.profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Les admins peuvent créer des profils
CREATE POLICY "Admins can insert profiles" ON public.profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Autoriser l'insertion pour le système/service (nécessaire pour le trigger)
-- Note: Le trigger s'exécute en tant que 'postgres' (service_role), mais il est bon d'avoir cette police
-- ou d'utiliser security definer sur la fonction.

-- =====================================================
-- TRIGGER: Création automatique de profil à l'inscription
-- =====================================================
-- Cette fonction sera appelée à chaque fois qu'un utilisateur s'inscrit
-- Elle permet de créer automatiquement le profil lié dans public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Utilisateur'),
        COALESCE(NEW.raw_user_meta_data->>'role', 'membre')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger après l'insertion d'un utilisateur dans auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- POLICIES: veuves
-- =====================================================
-- Admin et gestionnaire peuvent tout voir
CREATE POLICY "Admin and gestionnaire can view veuves" ON public.veuves
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'président', 'vice-président', 'secrétaire', 'trésorier', 'conseiller', 'gestionnaire', 'membre')
        )
    );

-- Bénéficiaires peuvent voir leurs propres données
CREATE POLICY "Beneficiaires can view own data" ON public.veuves
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'beneficiaire'
            AND email = (SELECT email FROM public.veuves WHERE id = veuves.id)
        )
    );

-- Admin et gestionnaire peuvent créer
CREATE POLICY "Admin and gestionnaire can insert veuves" ON public.veuves
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'président', 'vice-président', 'secrétaire', 'trésorier', 'conseiller', 'gestionnaire', 'membre')
        )
    );

-- Admin et gestionnaire peuvent modifier
CREATE POLICY "Admin and gestionnaire can update veuves" ON public.veuves
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'président', 'vice-président', 'secrétaire', 'trésorier', 'conseiller', 'gestionnaire', 'membre')
        )
    );

-- Seul admin peut supprimer
CREATE POLICY "Admin can delete veuves" ON public.veuves
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- POLICIES: orphelins
-- =====================================================
-- Admin, gestionnaire et membre peuvent voir
CREATE POLICY "Admin, gestionnaire, membre can view orphelins" ON public.orphelins
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'président', 'vice-président', 'secrétaire', 'trésorier', 'conseiller', 'gestionnaire', 'membre')
        )
    );

-- Admin et gestionnaire peuvent créer
CREATE POLICY "Admin and gestionnaire can insert orphelins" ON public.orphelins
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'président', 'vice-président', 'secrétaire', 'trésorier', 'conseiller', 'gestionnaire', 'membre')
        )
    );

-- Admin et gestionnaire peuvent modifier
CREATE POLICY "Admin and gestionnaire can update orphelins" ON public.orphelins
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'président', 'vice-président', 'secrétaire', 'trésorier', 'conseiller', 'gestionnaire', 'membre')
        )
    );

-- Seul admin peut supprimer
CREATE POLICY "Admin can delete orphelins" ON public.orphelins
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- POLICIES: programmes_aide
-- =====================================================
-- Tous les utilisateurs authentifiés peuvent voir les programmes
CREATE POLICY "Authenticated users can view programmes" ON public.programmes_aide
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Admin peut créer/modifier/supprimer
CREATE POLICY "Admin can manage programmes" ON public.programmes_aide
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- POLICIES: attributions_aide
-- =====================================================
-- Admin, gestionnaire, membre peuvent voir
CREATE POLICY "Admin, gestionnaire, membre can view attributions" ON public.attributions_aide
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'président', 'vice-président', 'secrétaire', 'trésorier', 'conseiller', 'gestionnaire', 'membre')
        )
    );

-- Admin et gestionnaire peuvent créer
CREATE POLICY "Admin and gestionnaire can insert attributions" ON public.attributions_aide
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'président', 'vice-président', 'secrétaire', 'trésorier', 'conseiller', 'gestionnaire', 'membre')
        )
    );

-- Admin et gestionnaire peuvent modifier
CREATE POLICY "Admin and gestionnaire can update attributions" ON public.attributions_aide
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'président', 'vice-président', 'secrétaire', 'trésorier', 'conseiller', 'gestionnaire', 'membre')
        )
    );

-- Seul admin peut supprimer
CREATE POLICY "Admin can delete attributions" ON public.attributions_aide
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- POLICIES: dons
-- =====================================================
-- Admin, gestionnaire, membre peuvent voir
CREATE POLICY "Admin, gestionnaire, membre can view dons" ON public.dons
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'président', 'vice-président', 'secrétaire', 'trésorier', 'conseiller', 'gestionnaire', 'membre')
        )
    );

-- Donateurs peuvent voir leurs propres dons
CREATE POLICY "Donateurs can view own dons" ON public.dons
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'donateur'
            AND id = dons.id_donateur
        )
    );

-- Admin, gestionnaire, donateur peuvent créer
CREATE POLICY "Admin, gestionnaire, donateur can insert dons" ON public.dons
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'président', 'vice-président', 'secrétaire', 'trésorier', 'conseiller', 'gestionnaire', 'membre', 'donateur')
        )
    );

-- Admin et gestionnaire peuvent modifier
CREATE POLICY "Admin and gestionnaire can update dons" ON public.dons
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'président', 'vice-président', 'secrétaire', 'trésorier', 'conseiller', 'gestionnaire', 'membre')
        )
    );

-- Seul admin peut supprimer
CREATE POLICY "Admin can delete dons" ON public.dons
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- INDEX POUR PERFORMANCES
-- =====================================================
CREATE INDEX idx_veuves_nom ON public.veuves(nom_complet);
CREATE INDEX idx_veuves_ville ON public.veuves(ville);
CREATE INDEX idx_veuves_date_adhesion ON public.veuves(date_adhesion);
CREATE INDEX idx_orphelins_nom ON public.orphelins(nom_complet);
CREATE INDEX idx_orphelins_mere ON public.orphelins(id_mere);
CREATE INDEX idx_attributions_veuve ON public.attributions_aide(id_veuve);
CREATE INDEX idx_attributions_orphelin ON public.attributions_aide(id_orphelin);
CREATE INDEX idx_attributions_date ON public.attributions_aide(date_attribution);
CREATE INDEX idx_dons_date ON public.dons(date_don);
CREATE INDEX idx_dons_donateur ON public.dons(id_donateur);

-- =====================================================
-- DONNÉES INITIALES
-- =====================================================

-- Insérer quelques programmes d'aide par défaut
INSERT INTO public.programmes_aide (nom_programme, type_aide, description, montant_standard) VALUES
    ('Aide Financière Mensuelle', 'financiere', 'Aide financière mensuelle pour les veuves en difficulté', 500.00),
    ('Bourse Scolaire', 'scolaire', 'Aide pour les frais de scolarité des orphelins', 300.00),
    ('Panier Alimentaire', 'alimentaire', 'Distribution mensuelle de denrées alimentaires', 200.00),
    ('Assistance Médicale', 'medicale', 'Prise en charge des frais médicaux', 1000.00);

-- =====================================================
-- FIN DU SCHEMA
-- =====================================================
