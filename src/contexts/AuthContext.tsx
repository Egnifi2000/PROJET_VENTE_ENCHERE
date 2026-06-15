import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "user";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  profile: { name: string; email: string; matricule: string | null } | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<{ name: string; email: string; matricule: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  const syncMissingMatricule = async (user: User, currentProfile?: { matricule: string | null } | null) => {
    console.log("[AuthContext] syncMissingMatricule start", { userId: user.id, currentProfile });
    const metadataMatricule = String(user.user_metadata?.matricule ?? "").trim().toUpperCase();
    const profileMatricule = String(currentProfile?.matricule ?? "").trim().toUpperCase();

    if (!metadataMatricule || profileMatricule) {
      console.log("[AuthContext] syncMissingMatricule noop", { metadataMatricule, profileMatricule });
      return currentProfile ?? null;
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({ matricule: metadataMatricule })
      .eq("user_id", user.id)
      .select("name, email, matricule")
      .single();

    if (error) {
      console.error("Erreur de synchronisation du matricule:", error);
      return currentProfile ?? null;
    }

    console.log("[AuthContext] syncMissingMatricule complete", data);
    return data;
  };

  const fetchUserData = async (currentUser: User) => {
    console.log("[AuthContext] fetchUserData start", currentUser.id);
    try {
      // Récupère le rôle (peut être vide pour un nouvel utilisateur)
      console.log("[AuthContext] fetchUserData get role start", currentUser.id);
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", currentUser.id)
        .single();
      console.log("[AuthContext] fetchUserData get role complete", { roleData, roleError });

      if (roleError && roleError.code !== "PGRST116") {
        console.error("Erreur rôle:", roleError);
      }
      if (roleData) setRole(roleData.role as AppRole);

      // Récupère le profil
      console.log("[AuthContext] fetchUserData get profile start", currentUser.id);
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("name, email, matricule")
        .eq("user_id", currentUser.id)
        .single();
      console.log("[AuthContext] fetchUserData get profile complete", { profileData, profileError });

      if (profileError && profileError.code !== "PGRST116") {
        console.error("Erreur profil:", profileError);
      }

      let nextProfile = profileData ?? null;
      nextProfile = await syncMissingMatricule(currentUser, nextProfile);

      if (nextProfile) setProfile(nextProfile);
      console.log("[AuthContext] fetchUserData complete", nextProfile);
    } catch (error) {
      console.error("Erreur lors du chargement des données utilisateur:", error);
      setRole(null);
      setProfile(null);
    }
  };

  useEffect(() => {
    console.log("[AuthContext] useEffect start");

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log("[AuthContext] auth state change", _event, session);
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          fetchUserData(session.user).catch((error) => {
            console.error("Erreur lors de la recuperation de l'utilisateur:", error);
            setRole(null);
            setProfile(null);
          });
        } else {
          setRole(null);
          setProfile(null);
        }

        setLoading(false);
        console.log("[AuthContext] auth state change complete, loading false");
      }
    );

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        console.log("[AuthContext] getSession resolved", session);
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchUserData(session.user).catch((error) => {
            console.error("Erreur lors de la recuperation de la session utilisateur:", error);
            setRole(null);
            setProfile(null);
          });
        }
      })
      .catch((error) => {
        console.error("Erreur lors de la recuperation de la session Supabase:", error);
      })
      .finally(() => {
        setLoading(false);
        console.log("[AuthContext] getSession complete, loading false");
      });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setRole(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, role, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}




