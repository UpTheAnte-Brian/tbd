// import GoogleSignInButton from "../components/ui/GoogleSignInButton";
import { login, signup, loginWithOAuth } from "../login/actions";

export default function SignupPage() {
  return (
    <div className="flex bg-red-400 border-1">
      <form className="mx-auto flex justify-center py-12 ">
        <div className="flex w-72 p-6 h-dvh flex-col justify-center border rounded-lg border-gray-700">
          <button onClick={loginWithOAuth}>Sign In with Google</button>
          {/* <GoogleSignInButton></GoogleSignInButton> */}
          <hr></hr>
          <p className="flex justify-center items-center py-8">
            Or use an email and password
          </p>
          <label htmlFor="email">Email:</label>
          <input id="email" name="email" type="email" required />
          <label htmlFor="password">Password:</label>
          <input id="password" name="password" type="password" required />
          <button formAction={login}>Log in</button>
          <button formAction={signup}>Sign up</button>
        </div>
      </form>
    </div>
  );
}

// import LoginForm from "@/app/ui/login-form";

// export default function LoginPage() {
//   return (
//     <>
//       <div className="mx-auto flex w-full max-w-[400px] flex-col space-y-2.5 p-4">
//         {/* <div className="flex-center-center h-20 w-full rounded-lg p-3">
//           <div className="w-full flex-center-center text-gray-400">
//             <AUNLogo />
//           </div>
//         </div> */}
//         {/* <Suspense> */}
//         <LoginForm />
//         {/* </Suspense> */}
//         <div className="flex w-full items-center justify-between">
//           <div className="text-xs text-gray-500">Don't have an account?</div>
//           <div className="text-xs text-blue-500">Sign up</div>
//         </div>
//       </div>
//     </>
//   );
// }
