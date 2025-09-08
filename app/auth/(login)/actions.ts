"use server";
import { z } from "zod";
import { validatedAction } from "../../../app/lib/auth/middleware";
import { redirect } from "next/navigation";
import { createClient } from "../../../utils/supabase/server";
import { AuthResponse } from "@supabase/supabase-js";

const host = process.env.NEXT_PUBLIC_HOST;
// Notes
// 	•	Why email as key?: Without IP access in actions, the email is a logical fallback.
// 	•	For production, switch to Redis or Supabase to store request timestamps across serverless invocations.
// 	•	Custom middleware: You could also wrap validatedAction itself in a throttle-aware version if you want to enforce throttling globally.

// Would you like help writing a Redis- or Supabase-backed throttler next?

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
    let response: AuthResponse;

    try {
      response = await supabase.auth.verifyOtp({
        email,
        token: loginCode,
        type: "email",
        options: {
          redirectTo: `${host}/auth/callback`,
        },
      });

      if (response.error) {
        console.error("verifyOtp error:", response.error);
        return { error: response.error.message };
      }
      if (!response.data || !response.data.user) {
        console.error("verifyOtp returned no user data");
        return { error: "Invalid or expired code." };
      }
    } catch (err) {
      console.error("verifyOtp threw exception:", err);
      throw err;
    }

    try {
      const { data: existingProfile } = await supabase
        .from("profile")
        .select("*")
        .eq("id", response.data.user.id)
        .maybeSingle();

      if (!existingProfile) {
        await supabase.from("profile").insert({
          id: response.data.user.id,
          username: response.data.user.email?.split("@")[0] ??
            response.data.user.id,
        });
      }
    } catch (cookieErr) {
      console.error("Error fetching user/session after verifyOtp:", cookieErr);
    }

    console.log("About to redirect after successful login");

    return { success: "Successfully signed in with login code." };
  },
);
export const signInWithGoogle = async (
  event: React.FormEvent<HTMLFormElement>,
) => {
  event.preventDefault();

  const supabase = await createClient();

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
