import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};

export const AuthProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadProfile = useCallback(async (userId, userEmail) => {
        if (!userId) {
            setProfile(null);
            return null;
        }

        const email = userEmail || 'user@school.local';
        const fallbackProfile = {
            id: userId,
            email,
            role: email === 'admin@school.local' ? 'admin' : 'teacher',
            teacher_id: null,
            full_name: null,
        };

        // Try fetching the real profile with a 10-second timeout safety net.
        // If fetch succeeds even AFTER fallback was applied, swap in the real profile.
        const fetchPromise = supabase
            .from('profiles')
            .select('id, email, role, teacher_id, full_name')
            .eq('id', userId)
            .maybeSingle()
            .then(({ data, error }) => {
                if (error) {
                    console.warn('[Auth] profiles fetch error:', error.message);
                    return null;
                }
                if (data) {
                    console.log('[Auth] Got real profile from Supabase:', { id: data.id, role: data.role, teacher_id: data.teacher_id });
                    setProfile(data);
                    return data;
                }
                return null;
            })
            .catch(err => {
                console.warn('[Auth] profiles fetch threw:', err?.message);
                return null;
            });

        try {
            const result = await Promise.race([
                fetchPromise,
                new Promise((_, reject) => setTimeout(() => reject(new Error('profile fetch timeout')), 10000))
            ]);
            if (result) return result;
            console.warn('[Auth] No profile row found, using fallback');
            setProfile(fallbackProfile);
            return fallbackProfile;
        } catch (err) {
            console.warn('[Auth] profile fetch timed out, using fallback for now; real profile will swap in if it arrives:', err?.message);
            setProfile(fallbackProfile);
            // Don't await — let the fetch finish in background and overwrite fallback
            return fallbackProfile;
        }
    }, []);

    useEffect(() => {
        console.log('[Auth] useEffect starting...');
        let mounted = true;
        // Safety timeout: if Supabase getSession() hangs, just finish loading state.
        // DO NOT clear session — that would log the user out unexpectedly.
        let timeout = setTimeout(() => {
            console.warn('[Auth] TIMEOUT after 5s — releasing loading state (keeping session)');
            if (mounted) {
                setLoading(false);
            }
        }, 5000);

        const initAuth = async () => {
            try {
                console.log('[Auth] initAuth starting...');
                const { data: { session } } = await supabase.auth.getSession();
                console.log('[Auth] Got session:', session?.user?.email);

                if (!mounted) {
                    console.log('[Auth] Component unmounted, aborting');
                    return;
                }

                setSession(session);
                if (session?.user) {
                    console.log('[Auth] Loading profile for user:', session.user.id);
                    await loadProfile(session.user.id, session.user.email);
                } else {
                    console.log('[Auth] No session user');
                }
            } catch (error) {
                console.error('[Auth] initAuth error:', error);
            } finally {
                if (mounted) {
                    console.log('[Auth] Setting loading to false');
                    setLoading(false);
                }
            }
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            console.log('[Auth] onAuthStateChange:', _event, session?.user?.email);
            if (!mounted) return;

            // Only clear session on explicit sign-out — refresh failures/etc shouldn't log the user out
            if (_event === 'SIGNED_OUT') {
                setSession(null);
                setProfile(null);
                return;
            }

            // For SIGNED_IN / TOKEN_REFRESHED / INITIAL_SESSION with a real session — update
            if (session) {
                setSession(session);
                if (session.user) {
                    // Only reload profile if user changed or we don't have one yet
                    // (TOKEN_REFRESHED keeps the same user — no need to refetch)
                    if (_event === 'SIGNED_IN' || _event === 'INITIAL_SESSION') {
                        await loadProfile(session.user.id, session.user.email);
                    }
                }
            }
            // If session is null but event isn't SIGNED_OUT — ignore (keep existing state)
        });

        return () => {
            console.log('[Auth] Cleanup');
            mounted = false;
            clearTimeout(timeout);
            subscription?.unsubscribe();
        };
    }, [loadProfile]);

    const signUp = async (email, password) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: window.location.origin,
            },
        });
        return { data, error };
    };

    const signIn = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email, password,
        });
        return { data, error };
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setProfile(null);
    };

    const linkTeacher = async (teacherId, fullName) => {
        if (!session?.user) return { error: new Error('Not authenticated') };
        const { data, error } = await supabase
            .from('profiles')
            .update({ teacher_id: teacherId, full_name: fullName })
            .eq('id', session.user.id)
            .select()
            .single();
        if (!error && data) setProfile(data);
        return { data, error };
    };

    const refreshProfile = async () => {
        if (session?.user) await loadProfile(session.user.id);
    };

    const isAdmin = profile?.role === 'admin';
    const isTeacher = profile?.role === 'teacher';
    const needsTeacherLink = isTeacher && !profile?.teacher_id;

    const currentUser = profile ? {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        teacherId: profile.teacher_id,
        name: profile.full_name || profile.email,
    } : null;

    return (
        <AuthContext.Provider value={{
            session,
            profile,
            currentUser,
            isAdmin,
            isTeacher,
            needsTeacherLink,
            loading,
            signUp,
            signIn,
            signOut,
            linkTeacher,
            refreshProfile,
            // Backward-compat helpers (some pages still use these names)
            logout: signOut,
        }}>
            {children}
        </AuthContext.Provider>
    );
};
