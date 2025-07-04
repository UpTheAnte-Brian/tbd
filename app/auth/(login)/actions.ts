"use server";
import { z } from "zod";
import { validatedAction } from "@/app/lib/auth/middleware";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

const signInSchema = z.object({
  email: z.string().email().min(3).max(255),
});

export const signIn = validatedAction(signInSchema, async (data) => {
  const supabase = await createClient();
  const { email } = data;

  const { data: signInData, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // set this to false if you do not want the user to be automatically signed up
      shouldCreateUser: true,
    },
  });
  console.log("signin data: ", signInData);
  if (error) {
    return { error: "Invalid credentials. Please try again." };
  }
  // const { data: userData, error: userDataError } = await supabase
  //   .from("user_data")
  //   .select("*")
  //   .eq("user_id", signInData.user?.id)
  //   .single();
  // console.log("userdata: ", userData);
  // if (userDataError && userDataError.code === "PGRST116") {
  //   // No user_data entry found, create one
  //   const { error: insertError } = await supabase
  //     .from("user_data")
  //     .insert({ user_id: signInData.user?.id });
  //   if (insertError) {
  //     console.error("Error creating user_data entry:", insertError);
  //     // Consider how you want to handle this error
  //   }
  // }
  // If sign-in is successful, redirect to dashboard
  redirect("/");
});

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  inviteId: z.string().optional(),
});

export const signUp = validatedAction(signUpSchema, async (data) => {
  const supabase = await createClient();
  const { email } = data;

  // const existingUser = await supabase
  //   .select()
  //   .from('auth.users')
  //   .where(eq(users.email, email))
  //   .limit(1);

  // if (existingUser.length > 0) {
  //   return { error: 'User already exists.' };
  // }

  // const passwordHash = await hashPassword(password);

  // const newUser: NewUser = {
  //   email,
  //   passwordHash,
  //   role: 'owner', // Default role, will be overridden if there's an invitation
  // };

  // const [createdUser] = await db.insert(users).values(newUser).returning();

  // if (!createdUser) {
  //   return { error: 'Failed to create user. Please try again.' };
  // }

  // let teamId: number;
  // let userRole: string;
  // let createdTeam: typeof teams.$inferSelect | null = null;

  // if (inviteId) {
  //   // Check if there's a valid invitation
  //   const [invitation] = await db
  //     .select()
  //     .from(invitations)
  //     .where(
  //       and(
  //         eq(invitations.id, parseInt(inviteId)),
  //         eq(invitations.email, email),
  //         eq(invitations.status, 'pending')
  //       )
  //     )
  //     .limit(1);

  //   if (invitation) {
  //     teamId = invitation.teamId;
  //     userRole = invitation.role;

  //     await db
  //       .update(invitations)
  //       .set({ status: 'accepted' })
  //       .where(eq(invitations.id, invitation.id));

  //     await logActivity(teamId, createdUser.id, ActivityType.ACCEPT_INVITATION);

  //     [createdTeam] = await db
  //       .select()
  //       .from(teams)
  //       .where(eq(teams.id, teamId))
  //       .limit(1);
  //   } else {
  //     return { error: 'Invalid or expired invitation.' };
  //   }
  // } else {
  //   // Create a new team if there's no invitation
  //   const newTeam: NewTeam = {
  //     name: `${email}'s Team`,
  //   };

  //   [createdTeam] = await db.insert(teams).values(newTeam).returning();

  //   if (!createdTeam) {
  //     return { error: 'Failed to create team. Please try again.' };
  //   }

  //   teamId = createdTeam.id;
  //   userRole = 'owner';

  //   await logActivity(teamId, createdUser.id, ActivityType.CREATE_TEAM);
  // }

  // const newTeamMember: NewTeamMember = {
  //   userId: createdUser.id,
  //   teamId: teamId,
  //   role: userRole,
  // };

  // await Promise.all([
  //   db.insert(teamMembers).values(newTeamMember),
  //   logActivity(teamId, createdUser.id, ActivityType.SIGN_UP),
  //   setSession(createdUser),
  // ]);

  // const redirectTo = formData.get('redirect') as string | null;
  // if (redirectTo === 'checkout') {
  //   const priceId = formData.get('priceId') as string;
  //   return createCheckoutSession({ team: createdTeam, priceId });
  // }

  const { data: signInData, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // set this to false if you do not want the user to be automatically signed up
      shouldCreateUser: true,
    },
  });
  console.log("signin data: ", signInData);
  if (error) {
    return { error: "Invalid credentials. Please try again." };
  }
  redirect("/welcome");
});
export const signInWithMagicLink = validatedAction(
  z.object({
    email: z.string().email(),
    redirect: z.string().optional(),
    priceId: z.string().optional(),
  }),
  async (data) => {
    const supabase = await createClient();
    const { email } = data;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: process.env.NEXT_PUBLIC_HOST,
      },
    });
    if (error) {
      console.error("Error sending magic link:", error);
      return { error: error.message };
    }

    return { success: "Magic link sent to your email." };
  },
);
export const signInWithLoginCode = validatedAction(
  z.object({
    email: z.string().email(),
    loginCode: z.string(),
    redirect: z.string().optional(),
  }),
  async (data) => {
    const supabase = await createClient();
    const { email, loginCode } = data;
    // const redirectTo = `${config.domainName}/api/auth/callback`;

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: loginCode,
      type: "email",
    });
    if (error) {
      console.error("Error sending magic link:", error);
      return { error: error.message };
    }

    return { success: "Magic link sent to your email." };
  },
);
export const signInWithGoogle = async (
  event: React.FormEvent<HTMLFormElement>,
) => {
  event.preventDefault();

  const supabase = await createClient();
  const host = process.env.NEXT_PUBLIC_HOST;

  try {
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${host}/auth/callback`,
      },
    });
    if (signInError) {
      return { error: "Failed to sign in with Google. Please try again." };
    }
  } catch (error) {
    return {
      error: "Failed to sign in with Google. Please try again.",
      message: error,
    };
  }
};

export const signOut = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/sign-in");
};
