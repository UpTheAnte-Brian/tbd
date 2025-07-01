"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";

export async function login(formData: FormData) {
    const supabase = await createClient();
    console.log("login function");

    // type-casting here for convenience
    // in practice, you should validate your inputs
    const data = {
        email: formData.get("email") as string,
        password: formData.get("password") as string,
    };

    const { error } = await supabase.auth.signInWithPassword(data);

    if (error) {
        console.log("error: ", error);
        redirect("/error");
    }

    revalidatePath("/", "layout");
    redirect("/account");
}

export async function signInWithOtp(formData: FormData) {
    const supabase = await createClient();

    // type-casting here for convenience
    // in practice, you should validate your inputs
    const data = {
        email: formData.get("email") as string,
        options: {
            // set this to false if you do not want the user to be automatically signed up
            shouldCreateUser: true,
        },
    };

    const {
        data: { session },
        error,
    } = await supabase.auth.signInWithOtp(data);
    console.log("session: ", session);
    if (error) {
        console.log("error: ", error);
        redirect("/error");
    }
}

export async function loginWithOAuth() {
    const supabase = await createClient();
    const host = process.env.NEXT_PUBLIC_HOST;

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
            redirectTo: `${host}/auth/callback`,
        },
    });
    // console.log("OAuth data:", data);
    if (data.url) {
        console.log("Redirect from login with Oauth:", data.url);
        redirect(data.url); // use the redirect API for your server framework
    }

    if (error) {
        redirect("/error");
    }

    revalidatePath("/", "layout");
    redirect("/account");
}

export async function loginWithGoogle() {
    const supabase = await createClient();
    const host = process.env.NEXT_PUBLIC_HOST;

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
            redirectTo: `${host}/auth/callback`,
        },
    });
    // console.log("OAuth data:", data);
    if (data.url) {
        console.log("Redirect from login with Oauth:", data.url);
        redirect(data.url); // use the redirect API for your server framework
    }

    if (error) {
        redirect("/error");
    }

    revalidatePath("/", "layout");
    redirect("/account");
}

export async function signup(formData: FormData) {
    const supabase = await createClient();

    // type-casting here for convenience
    // in practice, you should validate your inputs
    const data = {
        email: formData.get("email") as string,
        password: formData.get("password") as string,
    };

    const { error } = await supabase.auth.signUp(data);

    if (error) {
        redirect("/error");
    }

    revalidatePath("/", "layout");
    redirect("/account");
}

// export async function handleSignInWithGoogle(response: CredentialResponse) {
//   const { data, error } = await supabase.auth.signInWithIdToken({
//     provider: 'google',
//     token: response.credential,
//   })
// }
